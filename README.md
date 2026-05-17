# DeepSeek Local Agent

A local file agent MVP powered by DeepSeek V4. The app reads only the workspace folder selected by the user, asks DeepSeek to generate a structured operation plan, and executes the plan only after user confirmation.

## Supported

- Choose a local workspace folder.
- Use `deepseek-v4-flash` or `deepseek-v4-pro`.
- Add editable Markdown skills.
- Read the workspace file manifest.
- Read excerpts from common text files.
- Generate structured file operation plans.
- Execute confirmed operations:
  - Create folders.
  - Write UTF-8 text files.
  - Write small binary files from base64.
  - Create real `.pptx` PowerPoint files.
  - Rename files.
  - Move files.
  - Copy files.
- Back up overwritten files to `.agent-backups`.
- Block paths outside the selected workspace.

## Still Blocked

- File deletion.
- Arbitrary shell command execution.
- Default full-disk access.
- Single binary writes larger than 10 MB.
- Deep parsing for Word, PDF, and Excel.
- Code signing.

These limits are intentional for the first usable build.

## Development Run Folder

During active debugging, use the sibling folder:

```text
../deepseek-local-agent-dev-run
```

Run `Start-Agent.bat` or `Start-Agent.ps1` from that folder. It starts this project directly with `npm start`, so you do not need to rebuild an installer after every change.

## Skills

The app loads skills from two places:

- Global skills: the app data `skills` folder, opened from the sidebar.
- Workspace skills: `.agent-skills` inside the selected workspace.

Each skill uses a Codex-like folder layout:

```text
skill-name/
  SKILL.md
```

Use the sidebar buttons to create a template, then edit `SKILL.md` directly. Skills are injected into the model prompt on each request.

Global skills apply everywhere. Workspace skills only apply after that workspace is selected.

## Access Modes

- `Ask before writes`: show a confirmation dialog before executing file operations.
- `Auto-approve workspace writes`: execute planned file operations without a second confirmation.
- `Read-only`: allow planning and reading, but block writes in the main process.

The selected workspace and access mode are saved in the app config and restored on next launch.

## Language

The sidebar has a language selector for Chinese and English. The app defaults to Chinese and saves the selected language in local storage.

## Local Development

```bash
npm install
npm start
```

## Build Windows Installer

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run dist
```

The installer is generated at:

```text
release/DeepSeek Local Agent Setup 0.1.2.exe
```

## Binary File Generation

The agent can now use a `write_binary_file` operation:

```json
{
  "type": "write_binary_file",
  "path": "output/example.bin",
  "contentBase64": "AAECAwQ="
}
```

The app decodes `contentBase64` and writes the real binary file after confirmation. The per-operation binary limit is 10 MB.

## PowerPoint Generation

The agent can use a `create_pptx` operation:

```json
{
  "type": "create_pptx",
  "path": "output/presentation.pptx",
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide Title",
      "bullets": ["Point one", "Point two"],
      "notes": "Optional speaker notes"
    }
  ]
}
```

The app generates a real `.pptx` file locally. Current limit: 30 slides per operation.
