import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSocialCalendar } from "@/components/redes/BrandSocialCalendar";

export default function Redes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Redes Bionovations</h1>
        <p className="text-sm text-muted-foreground">Calendario de contenido para community managers</p>
      </div>
      <Tabs defaultValue="bionovations">
        <TabsList>
          <TabsTrigger value="bionovations">Bionovations SAS</TabsTrigger>
          <TabsTrigger value="sweatspot">Sweatspot</TabsTrigger>
          <TabsTrigger value="magical">Magical Warmers</TabsTrigger>
        </TabsList>
        <TabsContent value="bionovations" className="mt-4">
          <BrandSocialCalendar brand="bionovations" />
        </TabsContent>
        <TabsContent value="sweatspot" className="mt-4">
          <BrandSocialCalendar brand="sweatspot" />
        </TabsContent>
        <TabsContent value="magical" className="mt-4">
          <BrandSocialCalendar brand="magical" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
