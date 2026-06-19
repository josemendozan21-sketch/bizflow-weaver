import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSocialCalendar } from "@/components/redes/BrandSocialCalendar";
import { BrandIdeasBoard } from "@/components/redes/BrandIdeasBoard";

function BrandSection({ brand }: { brand: string }) {
  return (
    <Tabs defaultValue="ideas" className="mt-4">
      <TabsList>
        <TabsTrigger value="ideas">Ideas y eventos</TabsTrigger>
        <TabsTrigger value="calendario">Calendario</TabsTrigger>
      </TabsList>
      <TabsContent value="ideas" className="mt-4">
        <BrandIdeasBoard brand={brand} />
      </TabsContent>
      <TabsContent value="calendario" className="mt-4">
        <BrandSocialCalendar brand={brand} />
      </TabsContent>
    </Tabs>
  );
}

export default function Redes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Redes Bionovations</h1>
        <p className="text-sm text-muted-foreground">
          Ideas, eventos y calendario de contenido por marca
        </p>
      </div>
      <Tabs defaultValue="bionovations">
        <TabsList>
          <TabsTrigger value="bionovations">Bionovations SAS</TabsTrigger>
          <TabsTrigger value="sweatspot">Sweatspot</TabsTrigger>
          <TabsTrigger value="magical">Magical Warmers</TabsTrigger>
        </TabsList>
        <TabsContent value="bionovations">
          <BrandSection brand="bionovations" />
        </TabsContent>
        <TabsContent value="sweatspot">
          <BrandSection brand="sweatspot" />
        </TabsContent>
        <TabsContent value="magical">
          <BrandSection brand="magical" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
