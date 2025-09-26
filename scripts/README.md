# Clear Database Script

此脚本用于清空MongoDB数据库中的所有集合。

## 使用方法

1. 首先，确保您的环境变量已设置，特别是 `MONGODB_URI`:

```bash
# 创建 .env 文件并添加您的数据库连接字符串
cp .env.example .env
# 然后编辑 .env 文件并添加您的 MONGODB_URI
```

2. 运行清空数据库脚本:

```bash
pnpm clear-db
```

## 注意事项

⚠️  **警告**: 此操作将永久删除数据库中的所有数据，无法恢复。请在运行前确认您想要清空整个数据库。

## 脚本功能

- 连接到 MongoDB 数据库
- 列出所有集合
- 删除所有集合中的所有文档
- 确认操作完成