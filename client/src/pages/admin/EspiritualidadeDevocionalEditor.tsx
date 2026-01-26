import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload, IMAGE_UPLOAD_CONFIGS } from "@/components/ui/image-upload";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Eye, Star, Smartphone, Check, Youtube, Instagram, Music, Upload, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import MobileCropSelector from "@/components/MobileCropSelector";
import type { Devotional, MobileCropData } from "@shared/schema";

const mobileCropDataSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
}).nullable();

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  verse: z.string().min(1, "Versículo é obrigatório"),
  verseReference: z.string().min(1, "Referência é obrigatória"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  contentHtml: z.string().optional(),
  summary: z.string().optional(),
  prayer: z.string().optional(),
  imageUrl: z.string().optional(),
  mobileCropData: mobileCropDataSchema.optional(),
  author: z.string().optional(),
  youtubeUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function EspiritualidadeDevocionalEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = params.id && params.id !== "novo";
  const devotionalId = isEditing ? parseInt(params.id as string) : null;

  const { data: devotional, isLoading } = useQuery<Devotional>({
    queryKey: ["/api/espiritualidade/devotionals", devotionalId],
    enabled: !!devotionalId,
  });

  const [showMobileCrop, setShowMobileCrop] = useState(false);

  const parseMobileCropData = (data: string | null | undefined): MobileCropData | null => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      verse: "",
      verseReference: "",
      content: "",
      contentHtml: "",
      summary: "",
      prayer: "",
      imageUrl: "",
      mobileCropData: null,
      author: "",
      youtubeUrl: "",
      instagramUrl: "",
      audioUrl: "",
      isPublished: false,
      isFeatured: false,
    },
    values: devotional ? {
      title: devotional.title || "",
      verse: devotional.verse || "",
      verseReference: devotional.verseReference || "",
      content: devotional.content || "",
      contentHtml: devotional.contentHtml || "",
      summary: devotional.summary || "",
      prayer: devotional.prayer || "",
      imageUrl: devotional.imageUrl || "",
      mobileCropData: parseMobileCropData(devotional.mobileCropData),
      author: devotional.author || "",
      youtubeUrl: devotional.youtubeUrl || "",
      instagramUrl: devotional.instagramUrl || "",
      audioUrl: devotional.audioUrl || "",
      isPublished: devotional.isPublished || false,
      isFeatured: devotional.isFeatured || false,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", "/api/espiritualidade/devotionals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/devotionals"] });
      toast({ title: "Devocional criado com sucesso!" });
      setLocation("/admin/espiritualidade/devocionais");
    },
    onError: () => {
      toast({ title: "Erro ao criar devocional", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("PUT", `/api/espiritualidade/devotionals/${devotionalId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/devotionals"] });
      toast({ title: "Devocional atualizado com sucesso!" });
      setLocation("/admin/espiritualidade/devocionais");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar devocional", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/admin/espiritualidade/devocionais">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold" data-testid="text-page-title">
            {isEditing ? "Editar Devocional" : "Novo Devocional"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isEditing ? "Atualize as informacoes do devocional" : "Crie um novo devocional para a UMP"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Informacoes Principais</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Titulo, versiculo e conteudo do devocional</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: A Fé que Move Montanhas" {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="verse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Versículo</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Digite o texto do versículo" 
                              className="min-h-[80px]"
                              {...field} 
                              data-testid="input-verse" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="verseReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referência</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: João 3:16" {...field} data-testid="input-reference" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            content={field.value}
                            onChange={(content, html) => {
                              field.onChange(content);
                              form.setValue("contentHtml", html);
                            }}
                            placeholder="Escreva o conteúdo do devocional..."
                            data-testid="editor-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oração Final (opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Uma oração para encerrar o devocional..." 
                            className="min-h-[80px]"
                            {...field} 
                            data-testid="input-prayer" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                    Midia
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">YouTube, Instagram e Audio</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="youtubeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Youtube className="h-4 w-4 text-red-500" />
                          Vídeo do YouTube (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            {...field} 
                            data-testid="input-youtube" 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Cole a URL do vídeo do YouTube para incorporar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          Post/Reel do Instagram (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://www.instagram.com/p/..." 
                            {...field} 
                            data-testid="input-instagram" 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Cole a URL do post ou reel do Instagram
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="audioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-purple-500" />
                          Áudio (opcional)
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {field.value ? (
                              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <audio controls className="flex-1 h-10" src={field.value}>
                                  Seu navegador não suporta o elemento de áudio.
                                </audio>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => field.onChange("")}
                                  data-testid="button-remove-audio"
                                >
                                  <ArrowLeft className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  id="audio-upload"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    setIsUploadingAudio(true);
                                    try {
                                      const formData = new FormData();
                                      formData.append("file", file);
                                      
                                      const token = localStorage.getItem("token");
                                      const response = await fetch("/api/upload/audio", {
                                        method: "POST",
                                        body: formData,
                                        headers: {
                                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                        },
                                      });
                                      
                                      if (!response.ok) throw new Error("Upload failed");
                                      
                                      const data = await response.json();
                                      field.onChange(data.url);
                                      toast({ title: "Áudio enviado com sucesso!" });
                                    } catch (error) {
                                      toast({ 
                                        title: "Erro ao enviar áudio", 
                                        variant: "destructive" 
                                      });
                                    } finally {
                                      setIsUploadingAudio(false);
                                    }
                                  }}
                                  data-testid="input-audio-file"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => document.getElementById("audio-upload")?.click()}
                                  disabled={isUploadingAudio}
                                  className="w-full gap-2"
                                  data-testid="button-upload-audio"
                                >
                                  {isUploadingAudio ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  {isUploadingAudio ? "Enviando..." : "Selecionar Áudio"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Formato aceito: MP3, WAV, OGG (máximo 10MB)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Publicacao</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Controle de visibilidade</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Publicar
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Tornar visível no site
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-published"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Destaque
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Destacar na página inicial
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-featured"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Detalhes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Informacoes adicionais</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autor</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do autor" {...field} data-testid="input-author" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imagem de Capa (opcional)</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={(url) => {
                              field.onChange(url);
                              form.setValue("mobileCropData", null);
                            }}
                            aspectRatio={IMAGE_UPLOAD_CONFIGS.devotional.aspectRatio}
                            placeholder={IMAGE_UPLOAD_CONFIGS.devotional.placeholder}
                          />
                        </FormControl>
                        <FormDescription>
                          Imagem em formato 16:9 (landscape) para capa do devocional
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("imageUrl") && (
                    <FormField
                      control={form.control}
                      name="mobileCropData"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Recorte Mobile</FormLabel>
                            {field.value && (
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Check className="h-3 w-3" />
                                Configurado
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowMobileCrop(true)}
                              className="gap-2"
                              data-testid="button-configure-mobile-crop"
                            >
                              <Smartphone className="h-4 w-4" />
                              {field.value ? "Editar Recorte Mobile" : "Configurar Recorte Mobile"}
                            </Button>
                          </FormControl>
                          <FormDescription>
                            Selecione a area da imagem que sera exibida em dispositivos moveis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <MobileCropSelector
                    open={showMobileCrop}
                    onOpenChange={setShowMobileCrop}
                    imageSrc={form.watch("imageUrl") || ""}
                    cropData={form.watch("mobileCropData")}
                    onCropComplete={(data) => {
                      form.setValue("mobileCropData", data);
                      setShowMobileCrop(false);
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resumo (opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Breve resumo do devocional..." 
                            className="min-h-[60px]"
                            {...field} 
                            data-testid="input-summary" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Devocional"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
