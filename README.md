## 🛠️ Setup

> [!IMPORTANT]
> For Developers, after cloning, run:
```bash
bash scripts/setup-hooks.sh
```

### Dependencies

Activate virtual enviroment.
```bash
pip install -r requirements.txt
```


### Commit Title Types
| **Type**   | **Description**                                                                       |
| ---------- | ------------------------------------------------------------------------------------- |
| `feat`     | Adds, adjusts, or removes a new **feature** in the project                            |
| `fix`      | Fixes a **bug** related to a previously added feature                                 |
| `refactor` | Changes that **rewrite or restructure code** without changing functionality           |
| `perf`     | Performance-focused changes that optimize code (a special type of `refactor`)         |
| `style`    | Changes related to **code style** (e.g., formatting, whitespace) with no logic impact |
| `test`     | Adds missing tests or fixes existing ones                                             |
| `docs`     | Updates or adds **documentation** only                                                |
| `build`    | Changes that affect the **build system**, dependencies, versioning, or CI/CD          |
| `ops`      | Changes related to **operations** like deployment, infrastructure, or scripts         |
| `chore`    | Miscellaneous tasks (e.g., updating `.gitignore`, non-functional maintenance)         |

> [!NOTE]
> Also accepts compound titles like feat&fix