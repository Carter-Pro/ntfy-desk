use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

use crate::error::Result;
use crate::models::{AppSettings, Message, Subscription};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(data_dir: &PathBuf) -> Result<Self> {
        std::fs::create_dir_all(data_dir).map_err(|e| crate::error::Error::Config(e.to_string()))?;
        let db_path = data_dir.join("messages.db");
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<()> {
        let conn = self.lock()?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                topic TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id INTEGER NOT NULL,
                title TEXT,
                body TEXT,
                timestamp TEXT,
                received_at TEXT NOT NULL DEFAULT (datetime('now')),
                is_read INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_messages_subscription_id
                ON messages(subscription_id);
            CREATE INDEX IF NOT EXISTS idx_messages_received_at
                ON messages(received_at);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
        )?;
        Ok(())
    }

    fn lock(&self) -> Result<MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|e| crate::error::Error::Config(format!("database lock poisoned: {}", e)))
    }

    // ── Subscriptions ──

    pub fn add_subscription(&self, url: &str, topic: &str) -> Result<Subscription> {
        let conn = self.lock()?;
        conn.execute(
            "INSERT INTO subscriptions (url, topic) VALUES (?1, ?2)",
            rusqlite::params![url, topic],
        )?;
        let id = conn.last_insert_rowid();
        Ok(Subscription {
            id: Some(id),
            url: url.into(),
            topic: topic.into(),
            is_active: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub fn remove_subscription(&self, id: i64) -> Result<()> {
        let conn = self.lock()?;
        conn.execute("DELETE FROM messages WHERE subscription_id = ?1", rusqlite::params![id])?;
        conn.execute("DELETE FROM subscriptions WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn get_subscriptions(&self) -> Result<Vec<Subscription>> {
        let conn = self.lock()?;
        let mut stmt = conn.prepare(
            "SELECT id, url, topic, is_active, created_at FROM subscriptions ORDER BY created_at",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Subscription {
                id: Some(row.get(0)?),
                url: row.get(1)?,
                topic: row.get(2)?,
                is_active: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    // ── Messages ──

    pub fn insert_message(&self, msg: &Message) -> Result<Message> {
        let conn = self.lock()?;
        conn.execute(
            "INSERT INTO messages (subscription_id, title, body, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![msg.subscription_id, msg.title, msg.body, msg.timestamp],
        )?;
        let id = conn.last_insert_rowid();
        // Read back the database-computed received_at
        let received_at: String = conn.query_row(
            "SELECT received_at FROM messages WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )?;
        Ok(Message {
            id: Some(id),
            subscription_id: msg.subscription_id,
            title: msg.title.clone(),
            body: msg.body.clone(),
            timestamp: msg.timestamp.clone(),
            received_at,
            is_read: msg.is_read,
        })
    }

    pub fn insert_message_batch(&self, msgs: &[Message]) -> Result<()> {
        let mut conn = self.lock()?;
        let tx = conn.transaction()?;
        for msg in msgs {
            tx.execute(
                "INSERT INTO messages (subscription_id, title, body, timestamp)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![msg.subscription_id, msg.title, msg.body, msg.timestamp],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn get_messages(&self, subscription_id: Option<i64>, limit: u32, offset: u32) -> Result<Vec<Message>> {
        let conn = self.lock()?;
        let (sql, params): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(sub_id) = subscription_id {
            (
                "SELECT id, subscription_id, title, body, timestamp, received_at, is_read
                 FROM messages WHERE subscription_id = ?1
                 ORDER BY received_at DESC LIMIT ?2 OFFSET ?3",
                vec![Box::new(sub_id), Box::new(limit), Box::new(offset)],
            )
        } else {
            (
                "SELECT id, subscription_id, title, body, timestamp, received_at, is_read
                 FROM messages ORDER BY received_at DESC LIMIT ?1 OFFSET ?2",
                vec![Box::new(limit), Box::new(offset)],
            )
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(Message {
                id: Some(row.get(0)?),
                subscription_id: row.get(1)?,
                title: row.get(2)?,
                body: row.get(3)?,
                timestamp: row.get(4)?,
                received_at: row.get(5)?,
                is_read: row.get::<_, i32>(6)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn mark_read(&self, id: i64) -> Result<()> {
        let conn = self.lock()?;
        conn.execute("UPDATE messages SET is_read = 1 WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn delete_message(&self, id: i64) -> Result<()> {
        let conn = self.lock()?;
        conn.execute("DELETE FROM messages WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn cleanup_old_messages(&self, retention_days: u32) -> Result<usize> {
        let conn = self.lock()?;
        let count = conn.execute(
            "DELETE FROM messages WHERE received_at < datetime('now', ?1)",
            rusqlite::params![format!("-{} days", retention_days)],
        )?;
        Ok(count)
    }

    // ── Settings ──

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.lock()?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query_map(rusqlite::params![key], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(val) => Ok(Some(val?)),
            None => Ok(None),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.lock()?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }

    pub fn load_app_settings(&self) -> Result<AppSettings> {
        let mut settings = AppSettings::default();
        if let Some(v) = self.get_setting("dnd_enabled")? {
            settings.dnd_enabled = v == "true";
        }
        if let Some(v) = self.get_setting("dnd_start")? {
            settings.dnd_start = v;
        }
        if let Some(v) = self.get_setting("dnd_end")? {
            settings.dnd_end = v;
        }
        if let Some(v) = self.get_setting("notification_volume")? {
            settings.notification_volume = v.parse().unwrap_or(80);
        }
        if let Some(v) = self.get_setting("message_retention_days")? {
            settings.message_retention_days = v.parse().unwrap_or(30);
        }
        if let Some(v) = self.get_setting("startup_run")? {
            settings.startup_run = v == "true";
        }
        if let Some(v) = self.get_setting("minimize_to_tray")? {
            settings.minimize_to_tray = v == "true";
        }
        if let Some(v) = self.get_setting("notification_sound")? {
            settings.notification_sound = v;
        }
        Ok(settings)
    }

    pub fn save_app_settings(&self, settings: &AppSettings) -> Result<()> {
        self.set_setting("dnd_enabled", if settings.dnd_enabled { "true" } else { "false" })?;
        self.set_setting("dnd_start", &settings.dnd_start)?;
        self.set_setting("dnd_end", &settings.dnd_end)?;
        self.set_setting("notification_volume", &settings.notification_volume.to_string())?;
        self.set_setting("message_retention_days", &settings.message_retention_days.to_string())?;
        self.set_setting("startup_run", if settings.startup_run { "true" } else { "false" })?;
        self.set_setting("minimize_to_tray", if settings.minimize_to_tray { "true" } else { "false" })?;
        self.set_setting("notification_sound", &settings.notification_sound)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn setup_db() -> (Database, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db = Database::open(&dir.path().to_path_buf()).unwrap();
        (db, dir)
    }

    #[test]
    fn test_add_and_get_subscriptions() {
        let (db, _dir) = setup_db();
        db.add_subscription("https://ntfy.sh/test", "test-topic").unwrap();
        let subs = db.get_subscriptions().unwrap();
        assert_eq!(subs.len(), 1);
        assert_eq!(subs[0].url, "https://ntfy.sh/test");
        assert_eq!(subs[0].topic, "test-topic");
    }

    #[test]
    fn test_remove_subscription_cascades_messages() {
        let (db, _dir) = setup_db();
        let sub = db.add_subscription("https://ntfy.sh/test", "test").unwrap();
        let msg = Message {
            id: None,
            subscription_id: sub.id.unwrap(),
            title: Some("hello".into()),
            body: Some("world".into()),
            timestamp: Some("2025-01-01T00:00:00Z".into()),
            received_at: String::new(),
            is_read: false,
        };
        db.insert_message(&msg).unwrap();
        db.remove_subscription(sub.id.unwrap()).unwrap();
        let msgs = db.get_messages(None, 10, 0).unwrap();
        assert_eq!(msgs.len(), 0);
    }

    #[test]
    fn test_insert_and_get_messages() {
        let (db, _dir) = setup_db();
        let sub = db.add_subscription("https://ntfy.sh/test", "test").unwrap();
        for i in 0..5 {
            let msg = Message {
                id: None,
                subscription_id: sub.id.unwrap(),
                title: Some(format!("title {}", i)),
                body: None,
                timestamp: None,
                received_at: String::new(),
                is_read: false,
            };
            db.insert_message(&msg).unwrap();
        }
        let msgs = db.get_messages(None, 10, 0).unwrap();
        assert_eq!(msgs.len(), 5);
    }

    #[test]
    fn test_insert_message_batch() {
        let (db, _dir) = setup_db();
        let sub = db.add_subscription("https://ntfy.sh/test", "test").unwrap();
        let msgs: Vec<_> = (0..10)
            .map(|i| Message {
                id: None,
                subscription_id: sub.id.unwrap(),
                title: Some(format!("msg {}", i)),
                body: None,
                timestamp: None,
                received_at: String::new(),
                is_read: false,
            })
            .collect();
        db.insert_message_batch(&msgs).unwrap();
        let all = db.get_messages(None, 100, 0).unwrap();
        assert_eq!(all.len(), 10);
    }

    #[test]
    fn test_mark_read_and_delete() {
        let (db, _dir) = setup_db();
        let sub = db.add_subscription("https://ntfy.sh/test", "test").unwrap();
        let msg = Message {
            id: None,
            subscription_id: sub.id.unwrap(),
            title: Some("test".into()),
            body: None,
            timestamp: None,
            received_at: String::new(),
            is_read: false,
        };
        let inserted = db.insert_message(&msg).unwrap();
        let id = inserted.id.unwrap();

        db.mark_read(id).unwrap();
        let msgs = db.get_messages(None, 10, 0).unwrap();
        assert!(msgs[0].is_read);

        db.delete_message(id).unwrap();
        let msgs = db.get_messages(None, 10, 0).unwrap();
        assert_eq!(msgs.len(), 0);
    }

    #[test]
    fn test_settings_crud() {
        let (db, _dir) = setup_db();
        db.set_setting("foo", "bar").unwrap();
        assert_eq!(db.get_setting("foo").unwrap(), Some("bar".into()));
        db.set_setting("foo", "baz").unwrap();
        assert_eq!(db.get_setting("foo").unwrap(), Some("baz".into()));
        assert_eq!(db.get_setting("nonexistent").unwrap(), None);
    }

    #[test]
    fn test_app_settings_default_and_roundtrip() {
        let (db, _dir) = setup_db();
        let default = AppSettings::default();
        db.save_app_settings(&default).unwrap();
        let loaded = db.load_app_settings().unwrap();
        assert_eq!(loaded.dnd_enabled, default.dnd_enabled);
        assert_eq!(loaded.notification_volume, default.notification_volume);
    }

    #[test]
    fn test_cleanup_old_messages() {
        let (db, _dir) = setup_db();
        let sub = db.add_subscription("https://ntfy.sh/test", "test").unwrap();
        let msg = Message {
            id: None,
            subscription_id: sub.id.unwrap(),
            title: Some("old".into()),
            body: None,
            timestamp: None,
            received_at: String::new(),
            is_read: false,
        };
        db.insert_message(&msg).unwrap();
        // Manually set received_at to 2 days ago so cleanup catches it
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "UPDATE messages SET received_at = datetime('now', '-2 days')",
            [],
        )
        .unwrap();
        drop(conn);
        // With 30-day retention, message should stay
        assert_eq!(db.get_messages(None, 10, 0).unwrap().len(), 1);
        // With 1-day retention, message should be deleted
        db.cleanup_old_messages(1).unwrap();
        assert_eq!(db.get_messages(None, 10, 0).unwrap().len(), 0);
    }
}
