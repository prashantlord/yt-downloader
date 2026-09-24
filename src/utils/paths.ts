import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Detect if the script is running inside WSL
function isWsl(): boolean {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
  // Check the linux kernel release string for "microsoft"
  try {
    return os.release().toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
}

// Resolve the Windows Downloads folder when running from WSL
function windowsDownloadsDir(): string | null {
  try {
    const result = spawnSync("cmd.exe", ["/C", "echo %USERNAME%"], {
      encoding: "utf8",
      timeout: 5000,
    });
    const username = result.stdout?.trim();
    // cmd.exe may not be available or returned an unresolved variable
    if (!username || username.includes("%")) return null;

    const dir = path.win32.join("/mnt/c/Users", username, "Downloads");
    return fs.existsSync(dir) ? dir : null;
  } catch {
    return null;
  }
}

// Read the Downloads folder path from the XDG user directories config
function xdgDownloadsDir(): string | null {
  try {
    const configPath = path.join(
      os.homedir(),
      ".config",
      "user-dirs.dirs",
    );
    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, "utf8");
    // Matches a line like: XDG_DOWNLOAD_DIR="$HOME/Downloads"
    const match = content.match(/^XDG_DOWNLOAD_DIR="(.+)"$/m);
    if (!match) return null;

    // Expand $HOME and ~ into the real home directory
    const dir = match[1].replace(/\$\{HOME\}|~/g, os.homedir());
    return fs.existsSync(dir) ? dir : null;
  } catch {
    return null;
  }
}

// Resolve and create the directory where downloads are saved
export function getDownloadDir(): string {
  const fromEnv = process.env.DOWNLOAD_DIR;
  if (fromEnv) {
    const dir = path.resolve(fromEnv);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  let dir: string | null = null;

  if (isWsl() || process.platform === "win32") {
    dir = windowsDownloadsDir();
  }

  if (!dir && process.platform === "linux") {
    dir = xdgDownloadsDir();
  }

  if (!dir) {
    dir = path.join(os.homedir(), "Downloads");
  }

  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
