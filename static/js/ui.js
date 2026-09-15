export function showToast(message, type = "info") {
  const container = document.querySelector("#toast");
  if (!container) {
    return;
  }

  const toast = el("div", { className: `toast ${type}`, role: "status" }, [message]);
  container.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === false || value === null || value === undefined) {
      return;
    }

    if (key === "className") {
      node.className = value;
    } else if (key === "dataset") {
      Object.assign(node.dataset, value);
    } else if (key === "style" && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  });

  const childList = Array.isArray(children) ? children : [children];
  childList.forEach((child) => {
    if (child === null || child === undefined) {
      return;
    }
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });

  return node;
}
