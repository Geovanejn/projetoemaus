import { useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUpload, IMAGE_UPLOAD_CONFIGS } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2, Users, UserCheck } from "lucide-react";

const memberFormSchema = z.object({
  userId: z.number().optional().nullable(),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  position: z.string().min(1, "Cargo e obrigatorio"),
  bio: z.string().optional(),
  photoUrl: z.string().optional().or(z.literal("")),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  termStart: z.string().min(4, "Ano de inicio e obrigatorio"),
  termEnd: z.string().min(4, "Ano de fim e obrigatorio"),
  orderIndex: z.number().int().min(0).default(0),
  isCurrent: z.boolean().default(true),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface BoardMember {
  id: number;
  userId?: number | null;
  name: string;
  position: string;
  bio?: string;
  photoUrl?: string;
  instagram?: string;
  whatsapp?: string;
  termStart: string;
  termEnd: string;
  orderIndex: number;
  isCurrent: boolean;
}

interface UserOption {
  id: number;
  fullName: string;
  email: string;
  photoUrl?: string;
}

export default function MarketingDiretoriaEditor({ params }: { params?: { id: string } }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = params?.id && params.id !== "novo";

  const { data: allMembers } = useQuery<BoardMember[]>({
    queryKey: ["/api/admin/board-members"],
  });

  const { data: member, isLoading: loadingMember } = useQuery<BoardMember>({
    queryKey: ["/api/admin/board-members", params?.id],
    enabled: !!isEditing,
  });

  const { data: users } = useQuery<UserOption[]>({
    queryKey: ["/api/marketing/users"],
  });

  const nextOrderIndex = allMembers ? Math.max(...allMembers.map(m => m.orderIndex), -1) + 1 : 0;

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      userId: null,
      name: "",
      position: "",
      bio: "",
      photoUrl: "",
      instagram: "",
      whatsapp: "",
      termStart: new Date().getFullYear().toString(),
      termEnd: (new Date().getFullYear() + 1).toString(),
      orderIndex: nextOrderIndex,
      isCurrent: true,
    },
  });

  useEffect(() => {
    if (member) {
      form.reset({
        userId: member.userId || null,
        name: member.name,
        position: member.position,
        bio: member.bio || "",
        photoUrl: member.photoUrl || "",
        instagram: member.instagram || "",
        whatsapp: member.whatsapp || "",
        termStart: member.termStart,
        termEnd: member.termEnd,
        orderIndex: member.orderIndex,
        isCurrent: member.isCurrent,
      });
    }
  }, [member, form]);

  const handleUserSelect = (userIdStr: string) => {
    if (userIdStr === "manual") {
      form.setValue("userId", null);
      return;
    }
    
    const userId = parseInt(userIdStr);
    const selectedUser = users?.find(u => u.id === userId);
    if (selectedUser) {
      form.setValue("userId", userId);
      form.setValue("name", selectedUser.fullName);
      if (selectedUser.photoUrl) {
        form.setValue("photoUrl", selectedUser.photoUrl);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormValues) => {
      return apiRequest("POST", "/api/admin/board-members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/board-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/stats"] });
      toast({
        title: "Membro adicionado",
        description: "O membro foi adicionado à diretoria.",
      });
      navigate("/admin/marketing/diretoria");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o membro.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MemberFormValues) => {
      return apiRequest("PATCH", `/api/admin/board-members/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/board-members"] });
      toast({
        title: "Membro atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });
      navigate("/admin/marketing/diretoria");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o membro.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MemberFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectedUserId = form.watch("userId");
  const selectedUser = users?.find(u => u.id === selectedUserId);

  if (isEditing && loadingMember) {
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
        <Link href="/admin/marketing/diretoria">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {isEditing ? "Editar Membro" : "Novo Membro"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Atualize as informacoes do membro" : "Adicione um novo membro a diretoria"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Vincular Usuario do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selecionar Membro</FormLabel>
                    <Select 
                      onValueChange={handleUserSelect}
                      value={field.value?.toString() || "manual"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Selecione um membro cadastrado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Preenchimento manual</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.photoUrl} alt={user.fullName} />
                                <AvatarFallback className="text-xs">
                                  {user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.fullName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ao selecionar um membro, nome e foto serao preenchidos automaticamente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedUser && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.fullName} />
                    <AvatarFallback>
                      {selectedUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informacoes do Membro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do membro" 
                          {...field} 
                          data-testid="input-name"
                          disabled={!!selectedUserId}
                        />
                      </FormControl>
                      {selectedUserId && (
                        <FormDescription>
                          Nome preenchido automaticamente do usuario vinculado
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Presidente, Secretario" {...field} data-testid="input-position" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografia</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Breve descricao sobre o membro" 
                        className="min-h-[100px]"
                        {...field} 
                        data-testid="input-bio" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto do Membro</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        aspectRatio={IMAGE_UPLOAD_CONFIGS.board.aspectRatio}
                        placeholder={IMAGE_UPLOAD_CONFIGS.board.placeholder}
                        disabled={!!selectedUserId && !!selectedUser?.photoUrl}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedUserId && selectedUser?.photoUrl 
                        ? "Foto preenchida automaticamente do usuario vinculado" 
                        : "Foto quadrada (1:1) do membro"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="usuario (sem @)" {...field} data-testid="input-instagram" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} data-testid="input-whatsapp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gestao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="termStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano de Inicio</FormLabel>
                      <FormControl>
                        <Input placeholder="2024" {...field} data-testid="input-term-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano de Fim</FormLabel>
                      <FormControl>
                        <Input placeholder="2025" {...field} data-testid="input-term-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibicao</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-order" 
                      />
                    </FormControl>
                    <FormDescription>
                      Membros com ordem menor aparecem primeiro na lista
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isCurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Membro Ativo</FormLabel>
                      <FormDescription>
                        Marque se o membro faz parte da gestao atual
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-current"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/admin/marketing/diretoria">
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
                  {isEditing ? "Atualizar Membro" : "Adicionar Membro"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
