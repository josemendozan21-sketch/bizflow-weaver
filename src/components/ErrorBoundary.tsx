import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary] caught error:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Ocurrió un error al cargar esta vista</h2>
            <p className="text-sm text-muted-foreground break-words">
              {this.state.error.message || "Error desconocido"}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>Recargar</Button>
              <Button onClick={this.reset}>Reintentar</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}