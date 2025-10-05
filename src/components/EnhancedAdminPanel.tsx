import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminPanelProps {
  onClose: () => void;
}

export const EnhancedAdminPanel = ({ onClose }: AdminPanelProps) => {
  const [heroContent, setHeroContent] = useState<any>({});
  const [pricingContent, setPricingContent] = useState<any>({});
  const [faqContent, setFaqContent] = useState<any>({});
  const [buttonMappings, setButtonMappings] = useState<any[]>([]);
  const [animationSettings, setAnimationSettings] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const { data: sections } = await supabase
      .from("content_sections")
      .select("*");

    const { data: buttons } = await supabase
      .from("button_mappings")
      .select("*");

    const { data: animations } = await supabase
      .from("animation_settings")
      .select("*");

    sections?.forEach((section) => {
      if (section.section_name === "hero") setHeroContent(section.content);
      if (section.section_name === "pricing") setPricingContent(section.content);
      if (section.section_name === "faq") setFaqContent(section.content);
    });

    setButtonMappings(buttons || []);
    
    const animSettings: any = {};
    animations?.forEach((anim) => {
      animSettings[anim.setting_name] = anim.value;
    });
    setAnimationSettings(animSettings);
  };

  const saveContent = async (sectionName: string, content: any) => {
    const { error } = await supabase
      .from("content_sections")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("section_name", sectionName);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Changes published instantly" });
    }
  };

  const saveButtonMapping = async (button: any) => {
    const { error } = await supabase
      .from("button_mappings")
      .upsert({ ...button, updated_at: new Date().toISOString() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Button updated" });
    }
  };

  const saveAnimationSettings = async (settingName: string, value: any) => {
    const { error } = await supabase
      .from("animation_settings")
      .upsert({ setting_name: settingName, value, updated_at: new Date().toISOString() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Animation settings updated" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="min-h-screen p-8">
        <Card className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Enhanced Admin Control Panel</h1>
              <p className="text-muted-foreground mt-1">
                Full control over content, animations, and behavior • Real-time sync
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="buttons">Buttons</TabsTrigger>
              <TabsTrigger value="animations">Animations</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & FAQ</TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Hero Section</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={heroContent.headline || ""}
                      onChange={(e) => setHeroContent({ ...heroContent, headline: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={heroContent.description || ""}
                      onChange={(e) => setHeroContent({ ...heroContent, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={() => saveContent("hero", heroContent)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Hero
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Buttons Tab */}
            <TabsContent value="buttons" className="space-y-6">
              {buttonMappings.map((button) => (
                <Card key={button.id} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Button ID: {button.button_id}</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Text</Label>
                        <Input
                          value={button.text}
                          onChange={(e) => {
                            const updated = buttonMappings.map((b) =>
                              b.id === button.id ? { ...b, text: e.target.value } : b
                            );
                            setButtonMappings(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Hover Text</Label>
                        <Input
                          value={button.hover_text || ""}
                          onChange={(e) => {
                            const updated = buttonMappings.map((b) =>
                              b.id === button.id ? { ...b, hover_text: e.target.value } : b
                            );
                            setButtonMappings(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Route</Label>
                        <Input
                          value={button.route || ""}
                          onChange={(e) => {
                            const updated = buttonMappings.map((b) =>
                              b.id === button.id ? { ...b, route: e.target.value } : b
                            );
                            setButtonMappings(updated);
                          }}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant={button.enabled ? "default" : "secondary"}
                          onClick={() => {
                            const updated = buttonMappings.map((b) =>
                              b.id === button.id ? { ...b, enabled: !b.enabled } : b
                            );
                            setButtonMappings(updated);
                          }}
                        >
                          {button.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    </div>
                    <Button onClick={() => saveButtonMapping(button)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Button
                    </Button>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Animations Tab */}
            <TabsContent value="animations" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Animation Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Fade In Duration (ms)</Label>
                    <Input
                      type="number"
                      value={animationSettings.global?.fadeInDuration?.replace("ms", "") || "600"}
                      onChange={(e) => {
                        const newSettings = {
                          ...animationSettings,
                          global: {
                            ...animationSettings.global,
                            fadeInDuration: `${e.target.value}ms`,
                          },
                        };
                        setAnimationSettings(newSettings);
                      }}
                    />
                  </div>
                  <div>
                    <Label>Intro Display Duration (ms)</Label>
                    <Input
                      type="number"
                      value={animationSettings.intro?.displayDuration || "2000"}
                      onChange={(e) => {
                        const newSettings = {
                          ...animationSettings,
                          intro: {
                            ...animationSettings.intro,
                            displayDuration: parseInt(e.target.value),
                          },
                        };
                        setAnimationSettings(newSettings);
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      saveAnimationSettings("global", animationSettings.global);
                      saveAnimationSettings("intro", animationSettings.intro);
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Animation Settings
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Pricing & FAQ Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">FAQ Items</h3>
                <div className="space-y-4">
                  {(faqContent.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="border p-4 rounded space-y-2">
                      <Input
                        placeholder="Question"
                        value={item.question}
                        onChange={(e) => {
                          const items = [...(faqContent.items || [])];
                          items[idx].question = e.target.value;
                          setFaqContent({ ...faqContent, items });
                        }}
                      />
                      <Textarea
                        placeholder="Answer"
                        value={item.answer}
                        onChange={(e) => {
                          const items = [...(faqContent.items || [])];
                          items[idx].answer = e.target.value;
                          setFaqContent({ ...faqContent, items });
                        }}
                        rows={2}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const items = faqContent.items.filter((_: any, i: number) => i !== idx);
                          setFaqContent({ ...faqContent, items });
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const items = [...(faqContent.items || []), { question: "", answer: "" }];
                      setFaqContent({ ...faqContent, items });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add FAQ Item
                  </Button>
                  <Button onClick={() => saveContent("faq", faqContent)}>
                    <Save className="w-4 h-4 mr-2" />
                    Save FAQ
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};
