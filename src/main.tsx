import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Workaround for known React 18 + Radix portal bug:
// "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node"
// which can blank the entire app. Make removeChild/insertBefore no-op when the node
// is no longer a child of the parent (instead of throwing).
if (typeof Node !== "undefined") {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console && console.warn) {
        console.warn("Cannot remove a child from a different parent", child, this);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console && console.warn) {
        console.warn("Cannot insert before a reference node from a different parent", referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if (navigator.serviceWorker.controller && !sessionStorage.getItem("bionovations-sw-cleaned")) {
      sessionStorage.setItem("bionovations-sw-cleaned", "true");
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
