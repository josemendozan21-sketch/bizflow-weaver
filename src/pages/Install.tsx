import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, Plus, Download, Apple, Check } from "lucide-react";
import logo from "@/assets/logo-bionovations.jpg";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Install() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-4">
          <img src={logo} alt="Bionovations SAS" className="w-24 h-24 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-bold text-foreground">Instala Bionovations</h1>
          <p className="text-muted-foreground">
            Accede a la plataforma directamente desde la pantalla de inicio de tu celular.
          </p>
        </div>

        {installed && (
          <Card className="p-6 bg-primary/10 border-primary/30 flex items-center gap-3">
            <Check className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold">¡App instalada!</p>
              <p className="text-sm text-muted-foreground">Búscala en tu pantalla de inicio.</p>
            </div>
          </Card>
        )}

        {platform === "android" && deferred && !installed && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Android</h2>
            </div>
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 w-5 h-5" /> Instalar app ahora
            </Button>
          </Card>
        )}

        {(platform === "ios" || platform === "desktop") && !installed && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Apple className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">iPhone / iPad (Safari)</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
                <div className="flex items-center gap-2">
                  Toca el botón <Share className="inline w-4 h-4" /> <strong>Compartir</strong> en la barra inferior de Safari.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
                <div className="flex items-center gap-2">
                  Selecciona <Plus className="inline w-4 h-4" /> <strong>Agregar a pantalla de inicio</strong>.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
                <div>Toca <strong>Agregar</strong> en la esquina superior derecha.</div>
              </li>
            </ol>
          </Card>
        )}

        {(platform === "android" || platform === "desktop") && !deferred && !installed && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Android (Chrome)</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
                <div>Toca el menú <strong>⋮</strong> en la esquina superior derecha de Chrome.</div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
                <div>Selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
                <div>Confirma tocando <strong>Instalar</strong>.</div>
              </li>
            </ol>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Una vez instalada, la app se abre a pantalla completa y se actualiza sola.
        </p>
      </div>
    </div>
  );
}