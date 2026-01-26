import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload, IMAGE_UPLOAD_CONFIGS } from "@/components/ui/image-upload";
import { LocationInput } from "@/components/ui/location-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2, Calendar } from "lucide-react";

const eventFormSchema = z.object({
  title: z.string().min(3, "Titulo deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1, "Data de inicio e obrigatoria"),
  endDate: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  locationUrl: z.string().url("URL invalida").optional().or(z.literal("")),
  price: z.string().optional(),
  registrationUrl: z.string().url("URL invalida").optional().or(z.literal("")),
  category: z.string().min(1, "Selecione uma categoria"),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isAllDay: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface SiteEvent {
  id: number;
  title: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  locationUrl?: string;
  price?: string;
  registrationUrl?: string;
  category: string;
  isPublished: boolean;
  isFeatured: boolean;
  isAllDay: boolean;
}

const categories = [
  { value: "geral", label: "Geral" },
  { value: "culto", label: "Culto" },
  { value: "retiro", label: "Retiro" },
  { value: "estudo", label: "Estudo Bíblico" },
  { value: "social", label: "Social" },
  { value: "confraternizacao", label: "Confraternização" },
];

export default function MarketingEventoEditor({ params }: { params?: { id: string } }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = params?.id && params.id !== "novo";

  const { data: event, isLoading: loadingEvent } = useQuery<SiteEvent>({
    queryKey: ["/api/admin/events", params?.id],
    enabled: !!isEditing,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      shortDescription: "",
      imageUrl: "",
      startDate: "",
      endDate: "",
      time: "",
      location: "",
      locationUrl: "",
      price: "",
      registrationUrl: "",
      category: "geral",
      isPublished: true,
      isFeatured: false,
      isAllDay: false,
    },
    values: event ? {
      title: event.title,
      description: event.description || "",
      shortDescription: event.shortDescription || "",
      imageUrl: event.imageUrl || "",
      startDate: event.startDate,
      endDate: event.endDate || "",
      time: event.time || "",
      location: event.location || "",
      locationUrl: event.locationUrl || "",
      price: event.price || "",
      registrationUrl: event.registrationUrl || "",
      category: event.category,
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
      isAllDay: event.isAllDay,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      return apiRequest("POST", "/api/admin/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/stats"] });
      toast({
        title: "Evento criado",
        description: "O evento foi criado com sucesso.",
      });
      navigate("/admin/marketing/eventos");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o evento.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      return apiRequest("PATCH", `/api/admin/events/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({
        title: "Evento atualizado",
        description: "O evento foi atualizado com sucesso.",
      });
      navigate("/admin/marketing/eventos");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingEvent) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/marketing/eventos">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {isEditing ? "Editar Evento" : "Novo Evento"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Atualize as informacoes do evento" : "Preencha os dados do novo evento"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informacoes Basicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do evento" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem do Evento</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        aspectRatio={IMAGE_UPLOAD_CONFIGS.event.aspectRatio}
                        placeholder={IMAGE_UPLOAD_CONFIGS.event.placeholder}
                      />
                    </FormControl>
                    <FormDescription>
                      Imagem em formato 16:9 (landscape) para banners do evento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descricao Curta</FormLabel>
                    <FormControl>
                      <Input placeholder="Breve descricao para listagens" {...field} data-testid="input-short-desc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descricao Completa</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descricao detalhada do evento" 
                        className="min-h-[100px]"
                        {...field} 
                        data-testid="input-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data e Local</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim (opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horario</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormControl>
                  <LocationInput
                    locationName={form.watch("location") || ""}
                    locationUrl={form.watch("locationUrl") || ""}
                    onLocationNameChange={(name) => form.setValue("location", name)}
                    onLocationUrlChange={(url) => form.setValue("locationUrl", url)}
                    namePlaceholder="Ex: Igreja Presbiteriana Emaus"
                    urlPlaceholder="https://maps.google.com/..."
                    nameLabel="Nome do Local"
                    urlLabel="Link do Google Maps"
                  />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="isAllDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Evento de dia inteiro</FormLabel>
                      <FormDescription>
                        Marque se o evento dura o dia todo
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-all-day"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inscricao e Publicacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preco (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Gratuito ou R$ 50,00" {...field} data-testid="input-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Publicado</FormLabel>
                        <FormDescription>
                          Evento visivel no site
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Destaque</FormLabel>
                        <FormDescription>
                          Mostrar em destaque na home
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
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/admin/marketing/eventos">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={isPending} data-testid="button-save">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Atualizar Evento" : "Criar Evento"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
