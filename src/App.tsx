import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-[#202020] text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-[28px] font-semibold">ntfy desk</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          className="px-4 py-2 bg-[#2d2d2d] border border-white/20 rounded-lg text-white placeholder-[#999] focus:border-[#0078d4] outline-none transition-colors"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-lg font-medium transition-colors"
        >
          Greet
        </button>
      </form>

      {greetMsg && <p className="text-[#e0e0e0]">{greetMsg}</p>}
    </main>
  );
}

export default App;
