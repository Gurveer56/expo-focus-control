const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// On Windows, executables like `tsc` and `jest` are `.cmd` batch files and cannot be
// spawned directly — they require shell: true to resolve. On Unix, shell: true is
// unnecessary.
function spawnSyncWithAutoShell(command, args, options) {
  // Prefer project-local binary in node_modules/.bin
  const localBinDir = path.join(process.cwd(), 'node_modules', '.bin');
  const winCmd = path.join(localBinDir, `${command}.cmd`);
  const nixCmd = path.join(localBinDir, command);

  let resolvedCommand = command;
  if (process.platform === 'win32' && fs.existsSync(winCmd)) {
    resolvedCommand = winCmd;
  } else if (fs.existsSync(nixCmd)) {
    resolvedCommand = nixCmd;
  }

  const result = spawnSync(resolvedCommand, args, { ...options, shell: process.platform === 'win32' });
  if (result.error) {
    console.error(
      `Couldn't start \`${command}\` (${result.error.message}). The module's dependencies are probably not installed. ` +
        `Run your package manager's install command in the module directory, then run this script again.`
    );
  }
  return result;
}

module.exports = { spawnSyncWithAutoShell };
