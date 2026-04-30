const categories = [
  {
    id: "outbound",
    label: "AI 外呼",
    description: "智能语音外呼系统，自动筛选潜在客户，提高销售转化率"
  },
  {
    id: "growth",
    label: "AI 获客",
    description: "基于大数据分析的精准获客系统，帮助您找到最有价值的客户"
  },
  {
    id: "service",
    label: "AI 客服",
    description: "在线智能客服，解答客户疑问，提升服务质量"
  },
  {
    id: "design",
    label: "AI 设计",
    description: "一键生成多套设计方案，随意替换材质"
  }
];

const tools = [
  { name: "云蝠智能", category: ["outbound"], url: "https://www.ccgpt.net/", icon: "./assets/icons/yunfuzhineng.png" },
  { name: "语聚AI", category: ["outbound", "service"], url: "https://yuju-ai.com/about.html", icon: "./assets/icons/yujuai-mark.svg" },
  { name: "绿建管家", category: ["outbound"], url: "", icon: "./assets/icons/lvjianguanjia.png", access: "请用手机下载 APP，搜索“绿建管家”。" },
  { name: "客源星球", category: ["growth"], url: "", icon: "./assets/icons/keyuanxingqiu.jpg", access: "请用手机下载 APP，搜索“客源星球”。" },
  { name: "装企客源引擎", category: ["growth"], url: "", icon: "./assets/icons/zhuangqikeyuanyinqing.png", access: "请用手机下载 APP，搜索“装企客源引擎”。" },
  { name: "开拍", category: ["growth"], url: "https://www.kaipai.com/" },
  { name: "剪映", category: ["growth"], url: "https://www.capcut.cn/" },
  { name: "说得AI", category: ["growth"], url: "https://www.shuodeai.com/" },
  { name: "即梦 AI", category: ["growth"], url: "https://jimeng.jianying.com/" },
  { name: "来鼓AI", category: ["service"], url: "https://laigu.com/" },
  { name: "米多客", category: ["service"], url: "https://www.miduoke.net/" },
  { name: "美洽", category: ["service"], url: "https://www.meiqia.com/" },
  { name: "3Chat.ai", category: ["service"], url: "https://www.3chat.ai/" },
  { name: "晓多智能客服", category: ["service"], url: "https://www.xiaoduoai.com/" },
  { name: "快商通 AI 私信留资机器人", category: ["service"], url: "https://www.kuaishang.cn/", icon: "./assets/icons/kuaishangtong.png" },
  { name: "图销AI", category: ["service", "design"], url: "https://tuxiao.cc/" },
  { name: "酷家乐 AI", category: ["design"], url: "https://www.kujiale.com/hc/article/3FO4K4WPVV8V", icon: "./assets/icons/kujiale.png" },
  { name: "三维家", category: ["design"], url: "https://www.3vjia.com/" },
  { name: "AI室内大师", category: ["design"], url: "https://www.ai-houses.com/" },
  { name: "建筑学长", category: ["design"], url: "https://www.jianzhuxuezhang.com/" },
  { name: "美间", category: ["design"], url: "https://www.meijian.com/" }
];

const categoryOrder = {
  outbound: ["云蝠智能", "语聚AI", "绿建管家"],
  growth: ["客源星球", "装企客源引擎", "开拍", "剪映", "说得AI", "即梦 AI"],
  service: ["来鼓AI", "米多客", "美洽", "3Chat.ai", "晓多智能客服", "快商通 AI 私信留资机器人", "语聚AI", "图销AI"],
  design: ["酷家乐 AI", "三维家", "AI室内大师", "建筑学长", "图销AI", "美间"]
};

const state = {
  activeCategory: null
};

const categoryGrid = document.querySelector("#categoryGrid");
const categoryDialog = document.querySelector("#categoryDialog");
const closeCategoryDialog = document.querySelector("#closeCategoryDialog");
const detailTitle = document.querySelector("#categoryDialogTitle");
const toolGrid = document.querySelector("#toolGrid");
const appDialog = document.querySelector("#appDialog");
const closeDialog = document.querySelector("#closeDialog");
const appName = document.querySelector("#appName");
const appDescription = document.querySelector("#appDescription");

function toolsForCategory(categoryId) {
  const orderedNames = categoryOrder[categoryId] || [];

  return tools
    .filter((tool) => tool.category.includes(categoryId))
    .sort((left, right) => {
      const leftIndex = orderedNames.indexOf(left.name);
      const rightIndex = orderedNames.indexOf(right.name);
      const leftOrder = leftIndex === -1 ? 999 : leftIndex;
      const rightOrder = rightIndex === -1 ? 999 : rightIndex;

      return leftOrder - rightOrder || left.name.localeCompare(right.name, "zh-CN");
    });
}

function iconUrl(tool) {
  if (tool.icon) {
    return tool.icon;
  }

  if (tool.url) {
    const domain = new URL(tool.url).origin;
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`;
  }

  return "";
}

function iconLabel(name) {
  const compact = name.replace(/\s+/g, "").replace(/AI/gi, "");
  const chinese = compact.match(/[\u4e00-\u9fa5]/g) || [];

  if (chinese.length >= 2) {
    return `${chinese[0]}${chinese[1]}`;
  }

  if (chinese.length === 1) {
    return chinese[0];
  }

  const latin = compact.replace(/[^a-z0-9]/gi, "").toUpperCase();

  if (latin.length >= 2) {
    return latin.slice(0, 2);
  }

  return name.slice(0, 1).toUpperCase();
}

function iconHue(name) {
  let total = 0;

  for (const char of name) {
    total += char.charCodeAt(0);
  }

  return 190 + (total % 5) * 18;
}

function renderCategories() {
  categoryGrid.innerHTML = categories
    .map((category) => {
      return `
        <article class="category-card">
          <div class="category-copy">
            <h2>${category.label}</h2>
            <p class="category-description">${category.description}</p>
          </div>
          <button class="experience-button" data-category="${category.id}" type="button">立即体验</button>
        </article>
      `;
    })
    .join("");
}

function renderTools(categoryId) {
  const selectedCategory = categories.find((category) => category.id === categoryId);
  if (!selectedCategory) return;

  state.activeCategory = categoryId;
  detailTitle.textContent = selectedCategory.label;

  toolGrid.innerHTML = toolsForCategory(categoryId)
    .map((tool) => {
      const image = iconUrl(tool);
      const interactiveTag = tool.url ? "a" : "button";
      const href = tool.url ? `href="${tool.url}" target="_blank" rel="noreferrer"` : "";
      const control = tool.url ? "" : `type="button"`;

      return `
        <${interactiveTag}
          class="tool-tile"
          data-tool="${tool.name}"
          ${href}
          ${control}
          aria-label="${tool.url ? `打开 ${tool.name}` : `查看 ${tool.name} 使用方式`}"
        >
          <span class="tool-icon-shell" style="--badge-hue: ${iconHue(tool.name)}">
            <span class="tool-icon-fallback">${iconLabel(tool.name)}</span>
            ${image ? `<img class="tool-icon" src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
          </span>
          <span class="tool-name">${tool.name}</span>
        </${interactiveTag}>
      `;
    })
    .join("");

  categoryDialog.showModal();
}

function closeToolsDialog() {
  state.activeCategory = null;
  categoryDialog.close();
}

function openAppDialog(toolName) {
  const tool = tools.find((item) => item.name === toolName);
  if (!tool) return;

  appName.textContent = tool.name;
  appDescription.textContent = tool.access || `请用手机下载 APP，搜索“${tool.name}”。`;
  appDialog.showModal();
}

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  renderTools(button.dataset.category);
});

toolGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tool]");
  if (!button) return;
  openAppDialog(button.dataset.tool);
});

closeCategoryDialog.addEventListener("click", closeToolsDialog);
closeDialog.addEventListener("click", () => appDialog.close());

categoryDialog.addEventListener("click", (event) => {
  if (event.target === categoryDialog) closeToolsDialog();
});

appDialog.addEventListener("click", (event) => {
  if (event.target === appDialog) appDialog.close();
});

renderCategories();
