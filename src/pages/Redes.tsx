import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSocialCalendar } from "@/components/redes/BrandSocialCalendar";
import { BrandIdeasBoard } from "@/components/redes/BrandIdeasBoard";
import type { SocialBrand } from "@/hooks/useSocialPosts";
import { useAuth } from "@/contexts/AuthContext";

function BrandSection({ brand }: { brand: SocialBrand }) {
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
  const { role } = useAuth();
  const onlyBionovations = role === "community_manager";
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
          {!onlyBionovations && <TabsTrigger value="sweatspot">Sweatspot</TabsTrigger>}
          {!onlyBionovations && <TabsTrigger value="magical">Magical Warmers</TabsTrigger>}
        </TabsList>
        <TabsContent value="bionovations">
          <BrandSection brand="bionovations" />
        </TabsContent>
        {!onlyBionovations && (
          <TabsContent value="sweatspot">
            <BrandSection brand="sweatspot" />
          </TabsContent>
        )}
        {!onlyBionovations && (
          <TabsContent value="magical">
            <BrandSection brand="magical" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
