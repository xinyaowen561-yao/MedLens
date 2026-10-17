# MedLens 医疗 AR 智能眼镜原型

这是一份**课程作业用的网页原型**，用浏览器模拟未来医疗 AR 眼镜的交互界面。

它不是医疗器械，也**不能替代医生诊疗、急救或用药指导**。页面里的安全提示都是一般性说明；康复角度是滑块模拟值，不是真实人体识别。

## 这个项目能做什么

打开网页后可以看到四个模块：

1. **外伤应急辅助**：选择受伤部位和类型，填写经过，查看一般性安全提示，保存或删除记录。
2. **智能用药助手**：按医嘱添加药品、剂量和提醒时间。网页保持打开时会检查提醒，可选择语音播报。
3. **康复训练引导**：选择演示动作和目标角度，用滑块模拟当前角度，查看达标状态，保存训练记录。
4. **智能就诊助手**：填写症状等信息，生成可编辑的就诊摘要，支持复制和保存。**不会给出疾病诊断。**

所有演示数据保存在你自己的浏览器 `localStorage` 中，没有后端，也没有登录。

## 需要准备什么

- 一台电脑或手机
- Chrome、Edge、Safari 或 Firefox 等现代浏览器
- 如果要发布到 GitHub Pages：还需要 [Git](https://git-scm.com/) 和一个 GitHub 账号

本项目只有这些文件，不需要安装 Node.js，也不需要打包：

```text
MedLens/
  index.html    页面结构
  style.css     外观样式
  script.js     交互和本地存储
  README.md     本说明
  .nojekyll     让 GitHub Pages 按普通静态网站处理
```

## 如何在本地运行

### 方法 A：直接打开（最简单）

1. 进入 `MedLens` 文件夹。
2. 双击 `index.html`。
3. 页面会在浏览器中打开。

说明：个别浏览器在 `file://` 本地文件模式下，**复制摘要**可能被限制。如果复制失败，请改用方法 B。

### 方法 B：用本地小服务器（推荐）

如果你的电脑已安装 Python，在 `MedLens` 文件夹里打开终端，执行：

```bash
python -m http.server 8080
```

然后用浏览器打开：`http://localhost:8080`

在 Cursor / VS Code 里也可以安装 “Live Server” 插件，右键 `index.html` 选择在浏览器中打开。

## 如何修改内容（给初学者）

改完文件后**刷新浏览器**即可看到效果。建议先小范围修改，改错了可以用编辑器的撤销。

| 你想改什么 | 去哪个文件 | 大概改哪里 |
| --- | --- | --- |
| 产品名称、按钮文字、表单选项 | `index.html` | 搜索 `MedLens`、各模块标题 |
| 颜色、卡片、手机适配 | `style.css` | 文件开头的 `:root` 颜色变量 |
| 保存逻辑、提醒检查、摘要格式 | `script.js` | 对应模块的注释区块 |
| 外伤安全提示文案 | `index.html` | `id="traumaGuide"` 那一段 |

几个实用提示：

- **不要删除** `script.js` 里的 `escapeHtml` 函数。它用来防止用户输入破坏页面。
- 用药模块**不要**改成自动推荐剂量。作业要求必须由用户按医嘱自行填写。
- 刷新页面后记录还在，是因为数据写进了浏览器本地存储。换浏览器、清缓存或用无痕窗口会看不到以前的数据。
- 想清空全部演示数据：打开浏览器开发者工具 → Application / 应用程序 → Local Storage，删除 `medlens-mvp-v1`。

## 如何部署到 GitHub Pages

按下面做完后，别人就可以用一个 https 网址打开你的作业。

### 1. 安装 Git（如果还没有）

打开 [https://git-scm.com/](https://git-scm.com/) 下载安装。安装完成后重新打开终端。

### 2. 在 GitHub 新建仓库

1. 登录 GitHub，点击 **New repository**。
2. 仓库名建议用 `MedLens`。
3. 不要勾选 “Add a README”（本地已经有了）。
4. 创建仓库，复制仓库地址，例如：`https://github.com/你的用户名/MedLens.git`

### 3. 把本地文件推上去

在 `MedLens` 文件夹打开终端，把下面的 `你的用户名` 换成自己的 GitHub 用户名：

```bash
git init
git add .
git commit -m "Add MedLens AR glasses MVP"
git branch -M main
git remote add origin https://github.com/你的用户名/MedLens.git
git push -u origin main
```

如果 GitHub 要求登录，按网页提示完成授权即可。

### 4. 打开 GitHub Pages

1. 打开仓库页面 → **Settings** → **Pages**。
2. Source 选择 **Deploy from a branch**。
3. Branch 选择 `main`，文件夹选择 `/ (root)`。
4. 保存后等一两分钟。
5. 访问：`https://你的用户名.github.io/MedLens/`

如果打开是 404：确认仓库里根目录确实有 `index.html`，并且 Pages 选的是 `main` 的根目录。

### 5. 以后如何更新网站

改完文件后执行：

```bash
git add .
git commit -m "Update MedLens pages"
git push
```

稍等片刻，网上的页面就会更新。

## 使用时请注意

- 紧急情况请直接拨打当地急救电话，本网页不能呼救。
- 用药提醒**只在网页打开期间**检查；关闭网页后不能保证继续提醒。
- 康复模块中的角度全部是模拟值。
- 就诊摘要只是把你填的内容整理成条目，不会判断得了什么病。

## 常见问题

**刷新后数据没了？**  
可能用了无痕模式，或清理过浏览器数据。请用同一个普通浏览器窗口打开。

**语音没有声音？**  
需要在用药页勾选语音播报，并允许浏览器播放声音。有的浏览器要先点击一次页面才会发音。

**手机上看侧边栏不见了？**  
这是适配小屏幕：点左上角菜单按钮即可打开导航。
