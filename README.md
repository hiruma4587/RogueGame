# RogueGame

纯 Cloudflare Pages + D1 的网页 Roguelite。

当前版本包含：Canvas 俯视角动作战斗、WASD 移动、鼠标/触摸瞄准、自动攻击、随机敌人、精英敌人、经验、金币、升级三选一、D1 云存档 API。

## Cloudflare Pages 部署

本项目是 **Cloudflare Pages** 项目，不是普通 Worker，因此不要使用 `npx wrangler deploy`。

在 Cloudflare Pages 项目的 **Settings → Builds & deployments** 中设置：

- Build command：留空
- Build output directory：`.`
- Deploy command（如果你的 Pages 环境提供该字段）：`npx wrangler pages deploy . --project-name roguegame`

如果使用 Cloudflare Pages 的标准 Git 自动部署，则直接让 Pages 部署仓库根目录即可，不需要运行 `npx wrangler deploy`。

## D1

1. 创建 Cloudflare D1 数据库，名称建议 `roguegame`。
2. 在 Pages 项目的 **Settings → Bindings → D1 database bindings** 中添加绑定：
   - Variable name：`DB`
   - D1 database：选择 `roguegame`
3. 执行：`npx wrangler d1 execute roguegame --remote --file=schema.sql`

项目中的 `functions/api/save.js` 会通过 `env.DB` 访问 D1。

## 游戏

游戏核心运行在浏览器，D1 只保存云存档。

操作：WASD 移动，鼠标/触摸瞄准，角色自动攻击。
