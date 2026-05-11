use std::fs;
use std::path::PathBuf;

use crate::error::{Error, Result};

pub struct Config {
    config_dir: PathBuf,
    data_dir: PathBuf,
}

impl Config {
    pub fn new() -> Result<Self> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| Error::Config("no config directory".into()))?
            .join("ntfy-desk");
        let data_dir = dirs::data_dir()
            .ok_or_else(|| Error::Config("no data directory".into()))?
            .join("ntfy-desk");

        fs::create_dir_all(&config_dir).map_err(|e| Error::Config(e.to_string()))?;
        fs::create_dir_all(&data_dir).map_err(|e| Error::Config(e.to_string()))?;

        Ok(Self {
            config_dir,
            data_dir,
        })
    }

    pub fn config_dir(&self) -> &PathBuf {
        &self.config_dir
    }

    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }

    pub fn config_file(&self) -> PathBuf {
        self.config_dir.join("config.json")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_dirs_created() {
        let config = Config::new().unwrap();
        assert!(config.config_dir().exists());
        assert!(config.data_dir().exists());
        assert!(config.config_file().ends_with("config.json"));
    }
}
