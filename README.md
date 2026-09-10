# Steam Manifest Adapter（Steam 清单适配器）

**中文 | [English](./README.en.md)**

一个离线优先的 Android 开源工具：扫描盖世模拟器下载的 Steam 游戏目录，读取 `steamapps/appmanifest_<appid>.acf` 清单文件，把游戏目录适配成 WinNative 能识别的状态（删除 `.download_in_progress`、创建 `.download_complete`）。

> Read Steam `appmanifest_*.acf` files and adapt existing Steam game directories for WinNative.

## 它解决什么问题

盖世模拟器下载的 Steam 游戏目录里有 `appmanifest_*.acf`，但缺少 WinNative 识别已有游戏所需的 `.download_complete` 标记，导致 WinNative 无法直接扫描识别这些游戏。本工具利用 ACF 清单判断「哪个 Steam 游戏位于哪个目录」，再补齐 WinNative 需要的目录标记，让已有游戏被 WinNative 识别。

适配链路：

```text
Steam appmanifest_*.acf
        ↓ 读取与校验
盖世模拟器中的 Steam 游戏目录
        ↓ 写入 WinNative 需要的目录标记
WinNative 扫描并识别游戏
```

## 核心功能

- 通过系统目录选择器（Android Storage Access Framework）授权选择盖世模拟器的 Steam 游戏根目录
- 扫描目录中的 ACF 清单，列出可识别的游戏（名称、AppID、目录状态、可适配状态）
- 勾选一个或多个游戏，逐个适配为 WinNative 当前可识别的目录状态
- 对每个游戏给出明确结果：成功、已适配、跳过（含原因）或失败（含原因）
- `StateFlags` 异常的游戏一律跳过并说明原因，不提供「强制转换」
- 内置 WinNative 设置指引、盖世目录要求说明与常见问题
- 完全离线：不上传任何数据到服务器
- 多语言：跟随系统 / 简体中文 / English

## 它不会做什么

- 不下载、更新、校验或卸载游戏
- 不登录 Steam，不读取或保存密码、Cookie、Token
- 不修改游戏文件、不改写 ACF 内容、不改游戏目录名
- 不修改 WinNative 数据库，不自动获取 Steam PICS 信息，不自动找游戏 exe
- 不支持 root、不访问 Android 私有目录（`Android/data/`、`/data/data/`）、不要求全盘存储权限
- 第一阶段不支持 GameNative

## 使用前提

- Android 设备上已安装盖世模拟器，并通过它下载了 Steam 游戏
- 游戏目录位于系统文件选择器可访问的位置（私有目录无法处理）
- 已安装 WinNative，并按应用内指引完成相关设置

## 开发

技术栈：Expo SDK 57 + React Native + TypeScript，UI 组件库 [HeroUI Native](https://github.com/heroui-inc/heroui-native)，包管理使用 pnpm。

```bash
# 安装依赖
pnpm install

# 在 Android 上构建并运行
npm run android

# 校验
npm run lint
npx tsc --noEmit
npm test
```

## 声明

本项目是非官方开源工具，与 Steam、WinNative、盖世模拟器或未来支持的其他模拟器没有任何官方关联。使用本工具产生的一切后果由使用者自行承担，请确保你对所操作的游戏目录拥有合法权利。

## 许可证

[MIT](./LICENSE)
