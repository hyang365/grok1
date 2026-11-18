import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

class Boundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div className="crash">
        <h1>TripTable hit an error</h1>
        <p>{this.state.message}</p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("triptable-v1");
            location.reload();
          }}
        >
          Reset demo data
        </button>
      </div>
    );
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
createRoot(root).render(
  <Boundary>
    <App />
  </Boundary>,
);
