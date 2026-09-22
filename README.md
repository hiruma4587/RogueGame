# RogueGame

纯 Cloudflare Pages + D1 的网页 Roguelite。

当前版本包含：Canvas 俯视角动作战斗、WASD 移动、鼠标/触摸瞄准、自动攻击、随机敌人、精英敌人、经验、金币、升级三选一、D1 云存档 API。

部署：
1. 创建 Cloudflare D1 数据库，名称建议 roguegame。
2. 将数据库 ID 写入 wrangler.toml。
3. 执行 npx wrangler d1 execute roguegame --remote --file=schema.sql
4. 将仓库连接到 Cloudflare Pages，构建命令留空，输出目录填 .
5. Pages 项目绑定 D1，变量名使用 DB。

游戏核心运行在浏览器，D1 只保存云存档。