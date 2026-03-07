# git-crypt setup for chatXIV

The `docs/design-documents/` folder is encrypted with **git-crypt**. Only users whose GPG key has been added can decrypt it (intended for repo admin/owners).

**Authorized owners (GPG identities to add):** add each owner's GPG identity (e.g. key ID, fingerprint, or email).

## Requesting access

If you need access to `docs/design-documents/`:

1. **Create a GPG key** (if you don’t have one), e.g. `gpg --full-generate-key`.
2. **Export your public key** and send it to the repo owner (e.g. paste the output in a private channel):
   ```bash
   gpg --armor --export YOUR_EMAIL_OR_KEY_ID
   ```
3. **After the owner adds you**, clone (or pull), then in the repo root run:
   ```bash
   git-crypt unlock
   ```
   You’ll be prompted for your GPG key if needed. After that, files in `docs/design-documents/` are readable in your working copy.

## Why committing `.git-crypt/` is safe

The files in `.git-crypt/` that you commit are **not** the raw encryption key. When you run `git-crypt add-gpg-user`, git-crypt encrypts the repo’s symmetric key with that user’s **public** GPG key and stores the result in `.git-crypt/`. So what’s in the repo is **GPG-encrypted** key material. Only someone with the matching **private** GPG key can decrypt it and unlock `docs/design-documents/`. Everyone else can see the files in `.git-crypt/` but cannot use them without your private key.

## How the private key and unlock work

**Where the private key comes from**  
The private key is **yours** and never comes from the repo. Each admin creates their own GPG key pair on their machine (e.g. `gpg --full-generate-key`). The repo owner only adds your **public** key with `git-crypt add-gpg-user`; your **private** key stays on your computer in your GPG keychain. So: you don’t “get” the private key from anywhere—you generate it (or already have it), and the repo only ever gets the public half.

**How unlock works (existing clone or new clone)**  
When you run `git-crypt unlock`, git-crypt looks at the committed `.git-crypt/` directory (which contains the repo key encrypted for each added user). It asks GPG to try to decrypt one of those blobs using the **private keys in your local GPG keychain**. If your key was one of the ones added, GPG succeeds, git-crypt gets the symmetric key, and the repo is unlocked. So:

- **Repo already on your machine:** run `git-crypt unlock` once in that clone. Your GPG keychain is used to decrypt the key material; the unlocked state is then remembered for that clone.
- **New clone:** after `git clone`, run `git-crypt unlock` in the new clone. Same process—your local GPG key decrypts the key from `.git-crypt/` and the repo unlocks.

Nothing is “remembered” by the repo or the server; your **local** private key and your **local** unlock are what matter. On a new machine you need the same GPG key (or a backup) in that machine’s keychain, then `git-crypt unlock` works there too.

**If you’re an admin but don’t have a GPG key yet:** create one, then send your **public** key (e.g. `gpg --armor --export your@email.com`) to the repo owner so they can run `git-crypt add-gpg-user` for you.

### "Unusable public key" / key has no encryption capability

If the repo owner gets **"Unusable public key"** or **"encryption failed"** when running `git-crypt add-gpg-user`, your key can sign/certify but not encrypt. git-crypt needs to encrypt the repo key to your public key, so you must add an **encryption subkey** and export again:

1. **Edit your key:** `gpg --edit-key "Your Name <your@email.com>"`
2. At the `gpg>` prompt type: **`addkey`**
3. Choose **RSA (set your own capabilities)** (often option 8), then **Encrypt only (E)** (toggle off S and C so only E is set), key size 4096, expiry as you prefer.
4. Type **`save`** to exit.
5. **Export the full key (with subkeys):** `gpg --armor --export "Your Name <your@email.com>"`  
   Send that full output to the repo owner. The export will now include the new encryption subkey.

## Prerequisites

- **git-crypt** installed ([Windows](https://github.com/AGWA/git-crypt/blob/master/INSTALL.md), macOS: `brew install git-crypt`, Linux: `apt install git-crypt`)
- **GPG** installed (e.g. [Gpg4win](https://www.gpg4win.org/) on Windows, or built-in on macOS/Linux)

## One-time setup (repo owner / first admin)

Run these **once** in the repository root:

```bash
# 1. Initialize git-crypt
git-crypt init

# 2. Add each admin/owner by their GPG key (use key ID, fingerprint, or email)
git-crypt add-gpg-user USER_ID
# Example: git-crypt add-gpg-user alice@example.com
# Or:      git-crypt add-gpg-user 0xABCD1234

# 3. Commit the .git-crypt/ directory (GPG-encrypted key material; safe to commit)
git add .git-crypt/
git commit -m "Add git-crypt GPG keys for document encryption"
```

Only add GPG users who should have access to `docs/design-documents/`. Anyone not in the GPG list will see encrypted blobs for files under `docs/design-documents/`.

## Triage & fix (steps used during initial setup)

Use this section to reproduce or fix setup on a new machine or when something breaks. These steps were used for the initial chatXIV setup.

### Windows: install GPG and git-crypt

1. **GPG (Gpg4win):** `winget install GnuPG.Gpg4win`  
   GPG ends up at `C:\Program Files\GnuPG\bin\gpg.exe`. After install, open a new terminal so `gpg` is on PATH.

2. **git-crypt:** No official Windows binary. Options:
   - Download a Windows build (e.g. [oholovko/git-crypt-windows](https://github.com/oholovko/git-crypt-windows) releases), put `git-crypt.exe` in the repo root or on PATH.
   - Or use WSL and install with `apt install git-crypt` (or build from source).

3. **Tell Git where GPG is** (needed so git-crypt can use it):
   ```bash
   git config --local gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"
   ```
   Use your actual path if different.

### Create a GPG key without putting your real email in the key

Use batch key generation so the key UID uses a noreply email (e.g. `yourname@users.noreply.github.com`). Create a file (e.g. `.gpg-keygen-USER.txt`, **do not commit it**):

```
Key-Type: RSA
Key-Length: 4096
Name-Real: Your Name
Name-Email: yourname@users.noreply.github.com
Expire-Date: 0
%no-protection
%commit
```

Then run:

```bash
gpg --batch --generate-key .gpg-keygen-USER.txt
```

Use your chosen identity (e.g. `Your Name` or the key fingerprint) when running `git-crypt add-gpg-user YOUR_IDENTITY`. Add this file to `.gitignore` (e.g. `.gpg-keygen-*.txt`).

### GPG “public key not found” or trustdb errors

- **“invalid record type” / trustdb errors:** Backup and remove the trust database so GPG recreates it:
  - Windows: `%APPDATA%\gnupg\trustdb.gpg` → rename to `trustdb.gpg.bak`.
  - Then run `gpg --list-keys`; a new `trustdb.gpg` is created.

- **“Unusable public key” / “no assurance this key belongs to the named user”:** The key must be trusted for encryption. Set ultimate trust (6) for your key:
  1. Get fingerprint: `gpg --list-keys --keyid-format=long`
  2. Create a one-line file: `FINGERPRINT:6:` (e.g. `A1B2C3D4E5F6789012345678901234567890ABCD:6:`)
  3. Run: `gpg --import-ownertrust that-file.txt`
  4. Do not commit the ownertrust file; add `*.gpg-ownertrust.txt` or similar to `.gitignore`.

### Avoid storing your real email in commits

For the git-crypt–related commits (adding `.git-crypt/`, encrypting `docs/design-documents/`), use a noreply author so your real email is not in history:

**PowerShell:**

```powershell
$env:GIT_AUTHOR_NAME="Your Name"
$env:GIT_AUTHOR_EMAIL="yourname@users.noreply.github.com"
$env:GIT_COMMITTER_NAME="Your Name"
$env:GIT_COMMITTER_EMAIL="yourname@users.noreply.github.com"
git commit -m "Your message"
```

**Bash:**

```bash
GIT_AUTHOR_NAME="Your Name" GIT_AUTHOR_EMAIL=yourname@users.noreply.github.com \
GIT_COMMITTER_NAME="Your Name" GIT_COMMITTER_EMAIL=yourname@users.noreply.github.com \
git commit -m "Your message"
```

### Documents were committed before encryption was enabled

If `docs/design-documents/` was already in the repo when git-crypt was enabled, the working copy is marked for encryption but the last committed version may still be plaintext. Re-stage encrypted versions and commit:

```bash
git-crypt status -f
git add docs/design-documents/
git commit -m "Encrypt docs/design-documents/ with git-crypt"
```

Use the noreply author (see above) for this commit if you don’t want your email in history.

### Files to keep out of the repo

Add to `.gitignore` (or equivalent):

- `git-crypt.exe` (or wherever you put the Windows binary)
- `.gpg-keygen-*.txt` (batch keygen files)
- `.gpg-ownertrust.txt` (or similar) if you use an ownertrust file

## For collaborators with access (after clone)

If you are an admin whose GPG key was added:

```bash
git clone <repo-url>
cd chatXIV
git-crypt unlock
```

After `git-crypt unlock`, files in `docs/design-documents/` are decrypted in your working copy. They stay encrypted in the git history and on the remote.

## For everyone else

If you clone without unlocking, files under `docs/design-documents/` will appear as encrypted binary. You can work on the rest of the repo normally.

## Useful commands

| Command | Purpose |
|--------|--------|
| `git-crypt status` | Show which files are encrypted |
| `git-crypt status -e` | List only encrypted files |
| `git-crypt lock` | Re-encrypt working copy (e.g. before sharing screen) |

## Your email and commits

- **Commit author:** Every commit records an author (name + email) from your `git config user.name` and `user.email`. If you don't want your real email in the repo history, use a private or noreply address (e.g. GitHub's `username@users.noreply.github.com`) in that config, or override per-commit when making sensitive commits.
- **git-crypt commit:** Use a noreply identity (e.g. `Your Name <yourname@users.noreply.github.com>`) as the commit author when adding `.git-crypt/` or encrypting `docs/design-documents/` so your real email is not stored in history.
- **.git-crypt/ filenames:** Files under `.git-crypt/keys/` are named by GPG key **fingerprint** (hex), not by email or name, so your identity is not visible there.

## Security notes

- **History:** If `docs/design-documents/` was ever committed before encryption was enabled, those old commits still contain the unencrypted content in the repo history. New commits store only encrypted content.

- **Access is additive:** git-crypt has no “remove user” – once a key is added, it can always decrypt. To revoke access you’d need to re-init and re-add only the keys that should keep access (and accept that old history may still be decryptable by anyone who had the key).
- **.gitattributes** defines what is encrypted; don’t remove or weaken the `docs/design-documents/**` rule.
- Keep your GPG private key secure; anyone with it can decrypt `docs/design-documents/`.
