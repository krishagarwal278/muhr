const [major, minor] = process.versions.node.split(".").map(Number);
const ok = major > 20 || (major === 20 && minor >= 5);

if (!ok) {
  console.error(`Node ${process.versions.node} is not supported (need >=20.5.0).`);
  console.error("");
  console.error("Install Node 20 and put it first on your PATH, for example:");
  console.error("  brew install node@20");
  console.error('  export PATH="/opt/homebrew/opt/node@20/bin:$PATH"  # add to ~/.zshrc');
  console.error("");
  console.error("Or install nvm/fnm and run from this directory (see .nvmrc).");
  process.exit(1);
}
