robotics-kinematics-ebl-webapp/          # 项目根目录

├── public/                              # 静态资源目录，文件会被直接暴露访问
│   ├── models/                          # 3D 模型文件
│   │   └── robot-arm.glb                # 简单机械臂 3D 模型
│   ├── textures/                        # 3D 模型贴图文件
│   ├── images/                          # 普通图片资源
│   │   ├── robot-parts/                 # 机器人零件图片
│   │   └── backgrounds/                 # 页面背景图
│   └── icons/                           # 图标资源
│
├── src/                                 # 源代码目录
│   ├── app/                             # Next.js 页面路由层
│   │   ├── layout.tsx                   # 全站根布局
│   │   ├── page.tsx                     # 首页
│   │   ├── globals.css                  # 全局样式
│   │   ├── robot-basics/page.tsx        # Page 1：机械臂基础页面路由
│   │   ├── position/page.tsx            # Page 2：位置 Position 页面路由
│   │   ├── orientation/page.tsx         # Page 3：姿态 Orientation 页面路由
│   │   ├── transformation/page.tsx      # Page 4：变换矩阵页面路由
│   │   ├── forward-kinematics/page.tsx  # Page 5：正运动学页面路由
│   │   ├── inverse-kinematics/page.tsx  # Page 6：逆运动学页面路由
│   │   └── advanced/page.tsx            # Page 7：高级运动学页面路由
│   │
│   ├── components/                      # React 组件目录
│   │   ├── pages/                       # 每一页的主体页面组件
│   │   │   ├── RobotBasicsPage.tsx      # Page 1 主体组件
│   │   │   ├── PositionPage.tsx         # Page 2 主体组件
│   │   │   ├── OrientationPage.tsx      # Page 3 主体组件
│   │   │   ├── TransformationPage.tsx   # Page 4 主体组件
│   │   │   ├── ForwardKinematicsPage.tsx # Page 5 主体组件
│   │   │   ├── InverseKinematicsPage.tsx # Page 6 主体组件
│   │   │   └── AdvancedPage.tsx         # Page 7 主体组件
│   │   │
│   │   ├── layout/                      # 全站共用布局组件
│   │   │   ├── AppShell.tsx             # 页面整体框架
│   │   │   ├── TopBar.tsx               # 顶部栏
│   │   │   ├── ChapterSidebar.tsx       # 左侧七章节导航栏
│   │   │   ├── BottomPanel.tsx          # 底部提示、检查、下一步区域
│   │   │   └── StepProgress.tsx         # 学习进度显示
│   │   │
│   │   ├── learning/                    # 教学展示组件
│   │   │   ├── ExplanationPanel.tsx     # 文字解释面板
│   │   │   ├── FormulaPanel.tsx         # 公式显示面板
│   │   │   ├── HintBox.tsx              # Good Job / Hint 提示框
│   │   │   ├── CheckButton.tsx          # 检查答案按钮
│   │   │   ├── NextButton.tsx           # 下一页按钮
│   │   │   └── PageSummary.tsx          # 每页结尾总结
│   │   │
│   │   ├── visual2d/                    # 2D SVG 可视化组件
│   │   │   ├── RobotArm2D.tsx           # 2D 机械臂
│   │   │   ├── CoordinateFrame2D.tsx    # 2D 坐标系
│   │   │   ├── MatrixViewer.tsx         # 矩阵显示与高亮
│   │   │   ├── Workspace2D.tsx          # 机械臂可达工作空间
│   │   │   ├── ObjectFrame2D.tsx        # 物体坐标系显示
│   │   │   └── AxisLegend.tsx           # 坐标轴颜色说明
│   │   │
│   │   ├── three/                       # 3D React Three Fiber 组件
│   │   │   ├── RobotArmScene.tsx        # 3D 场景入口
│   │   │   ├── RobotArmModel.tsx        # 3D 机械臂模型
│   │   │   ├── Joint3D.tsx              # 3D 关节组件
│   │   │   ├── Link3D.tsx               # 3D 连杆组件
│   │   │   ├── CoordinateAxes3D.tsx     # 3D 坐标轴
│   │   │   └── ThreeCanvasWrapper.tsx   # 3D Canvas 包装组件
│   │   │
│   │   ├── interaction/                 # 交互控件组件
│   │   │   ├── AngleSlider.tsx          # 角度滑块
│   │   │   ├── TargetPicker.tsx         # 点击目标点组件
│   │   │   ├── DragPartBuilder.tsx      # 拖拽组装机械臂零件
│   │   │   ├── AxisSelector.tsx         # X/Y/Z 轴选择器
│   │   │   ├── RotationControl.tsx      # 旋转控制器
│   │   │   └── NumberInput.tsx          # 数值输入框
│   │   │
│   │   └── ui/                          # 基础 UI 组件
│   │       ├── Button.tsx               # 通用按钮
│   │       ├── Card.tsx                 # 通用卡片
│   │       ├── Tabs.tsx                 # 标签页组件
│   │       ├── Badge.tsx                # 状态标签
│   │       └── Modal.tsx                # 弹窗组件
│   │
│   ├── content/                         # 教学内容数据
│   │   ├── chapters.ts                  # 七个章节标题、路径、顺序
│   │   ├── pages.ts                     # 每页介绍和学习目标
│   │   ├── formulas.ts                  # KaTeX / MathJax 公式字符串
│   │   ├── hints.ts                     # 错误提示和反馈文本
│   │   ├── questions.ts                 # 每页检查问题
│   │   └── summaries.ts                 # 每页总结文本
│   │
│   ├── data/                            # 结构化项目数据
│   │   ├── robotParts.ts                # 机器人零件数据
│   │   ├── defaultRobot.ts              # 默认机械臂参数
│   │   └── examples.ts                  # 示例角度、目标点、演示数据
│   │
│   ├── hooks/                           # 自定义 React Hooks
│   │   ├── useForwardKinematics.ts      # 正运动学计算 hook
│   │   ├── useInverseKinematics.ts      # 逆运动学计算 hook
│   │   ├── useRobotDrag.ts              # 拖拽交互 hook
│   │   ├── useLocalProgress.ts          # 本地学习进度 hook
│   │   └── useMounted.ts                # 客户端挂载检测 hook
│   │
│   ├── config/                          # 全局配置
│   │   ├── routes.ts                    # 页面路由配置
│   │   ├── site.ts                      # 网站名称、描述等信息
│   │   ├── constants.ts                 # 全局常量
│   │   └── theme.ts                     # 主题、颜色、尺寸配置
│   │
│   ├── lib/                             # 工具函数和核心计算
│   │   ├── kinematics/                  # 机器人运动学公式
│   │   │   ├── forward2D.ts             # 2D 正运动学
│   │   │   ├── inverse2D.ts             # 2D 逆运动学
│   │   │   ├── forward3D.ts             # 简单 3D 正运动学
│   │   │   ├── rotationMatrix.ts        # 旋转矩阵
│   │   │   ├── transformMatrix.ts       # 齐次变换矩阵
│   │   │   ├── coordinateSystems.ts     # 柱坐标 / 球坐标转换
│   │   │   └── dh.ts                    # DH 参数计算
│   │   │
│   │   ├── math/                        # 通用数学工具
│   │   │   ├── angle.ts                 # 角度与弧度转换
│   │   │   ├── vector.ts                # 向量运算
│   │   │   ├── matrix.ts                # 矩阵运算
│   │   │   └── formatNumber.ts          # 数值格式化
│   │   │
│   │   └── storage/                     # 本地存储工具
│   │       └── progressStorage.ts       # localStorage 学习进度读写
│   │
│   ├── store/                           # Zustand 状态管理
│   │   ├── useRobotArmStore.ts          # 机械臂角度、关节、目标点状态
│   │   ├── useProgressStore.ts          # 学习进度和页面解锁状态
│   │   └── useUIStore.ts                # UI 状态，如弹窗、提示、公式显示
│   │
│   └── types/                           # TypeScript 类型定义
│       ├── robot.ts                     # Robot、Joint、Link 类型
│       ├── kinematics.ts                # FK / IK 输入输出类型
│       ├── matrix.ts                    # Matrix、Vector 类型
│       ├── page.ts                      # Page、Chapter、Content 类型
│       └── interaction.ts               # Drag、Target、Selection 类型
│
├── tests/                               # 测试文件
│   └── kinematics.test.ts               # 运动学函数测试
│
├── docs/                                # 项目文档
│   ├── ARCHITECTURE.md                  # 架构说明文档
│   ├── DEVELOPMENT_PLAN.md              # 开发计划文档
│   └── GIT_WORKFLOW.md                  # GitHub 协作规范
│
├── next.config.ts                       # Next.js 配置，包含静态导出设置
├── package.json                         # 项目依赖和 npm scripts
├── tsconfig.json                        # TypeScript 配置
├── tailwind.config.ts                   # Tailwind CSS 配置
├── postcss.config.js                    # PostCSS 配置
├── README.md                            # 项目说明文档
└── .gitignore                           # Git 忽略文件配置