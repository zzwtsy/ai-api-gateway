export const pageManifest = [
  {
    id: "overview",
    path: "/",
    navGroup: "监控",
    label: "概览",
    icon: "gauge",
  },
  {
    id: "requests",
    path: "/requests",
    navGroup: "监控",
    label: "请求",
    icon: "requests",
  },
  {
    id: "connections",
    path: "/connections",
    navGroup: "配置",
    label: "连接",
    icon: "connections",
  },
  {
    id: "models",
    path: "/models",
    navGroup: "配置",
    label: "模型",
    icon: "models",
  },
  {
    id: "clients",
    path: "/clients",
    navGroup: "配置",
    label: "客户端",
    icon: "clients",
  },
] as const;
