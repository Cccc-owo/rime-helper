# Rime Update Helper

一个用于 Android 平台的 KernelSU/Magisk 模块，提供 **Rime 资源更新与文件同步**能力。

> 说明：本项目负责资源下载与文件同步到输入法数据目录，不直接控制输入法内 Rime 引擎的「重新部署」动作。
>
> 「资源」指输入方案/词库/模型等。

## 功能特性

- 资源更新
  - 检查启用资源是否有新版本
  - 按资源或批量下载更新
- 文件同步
  - 将资源文件同步到已检测输入法的数据目录
  - 支持多资源按 `order` 顺序合并（后者覆盖前者同名文件）
- 资源管理
  - 启用/禁用资源
  - 添加、编辑、删除自定义资源
  - 重置默认资源
- 维护能力
  - 查看运行日志
  - 清除下载缓存

## 支持环境

- Root 环境：KernelSU / Magisk
- 输入法：
  - fcitx5-android
  - Trime

## 项目结构

```text
module/          KernelSU/Magisk 模块目录（打包后 ZIP 根）
  scripts/       Shell 脚本库（BusyBox ash 兼容）
  webroot/       WebUI 构建产物（自动生成）
webui/           SolidJS + TypeScript 前端源码
build.sh         本地构建脚本
```

## 本地开发

### 1) 构建 WebUI

```sh
pnpm --dir webui install
pnpm --dir webui run build
```

构建产物输出到：`module/webroot/`

### 2) 打包模块

```sh
./build.sh [version] [versionCode]
```

示例：

```sh
./build.sh v1.0.0 1
```

输出文件：`out/rime_helper-v1.0.0.zip`
