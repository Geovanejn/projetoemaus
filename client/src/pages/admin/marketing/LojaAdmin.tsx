import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowUp,
  ArrowDown,
  Package, 
  Plus, 
  Pencil,
  Trash2,
  Search,
  Loader2,
  Store,
  ImagePlus,
  Eye,
  EyeOff,
  X,
  Upload,
  FolderPlus,
  Ruler,
  Tag,
  Percent,
  Calendar,
  Hash,
  ShoppingBag,
  Send
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

interface ShopCategory {
  id: number;
  name: string;
  imageData: string | null;
  hasImage: boolean;
  isDefault: boolean;
}

interface ShopItemImage {
  id: number;
  itemId: number;
  gender: string;
  imageData: string;
  sortOrder: number;
}

interface ShopItemSize {
  id: number;
  itemId: number;
  gender: string;
  size: string;
  sortOrder: number;
}

interface ShopItemAdmin {
  id: number;
  name: string;
  description: string | null;
  price: number;
  categoryId: number;
  genderType: string;
  hasSize: boolean;
  isAvailable: boolean;
  isPreOrder: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  featuredOrder: number | null;
  bannerImageData: string | null;
  allowInstallments: boolean;
  maxInstallments: number | null;
  stockQuantity: number | null;
  category?: ShopCategory;
  images?: ShopItemImage[];
  sizes?: ShopItemSize[];
}

interface PromoCode {
  id: number;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  categoryId: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  category?: ShopCategory | null;
}

const itemFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.number().min(0, "Preço deve ser positivo"),
  categoryId: z.number().min(1, "Selecione uma categoria"),
  genderType: z.string().min(1, "Selecione o tipo"),
  hasSize: z.boolean(),
  isAvailable: z.boolean(),
  isPreOrder: z.boolean(),
  isFeatured: z.boolean(),
  featuredOrder: z.number().optional(),
  allowInstallments: z.boolean(),
  maxInstallments: z.number().min(1).max(12).optional(),
  stockQuantity: z.number().min(0).nullable().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCurrencyInput(value: number): string {
  return (value / 100).toFixed(2).replace(".", ",");
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

function getGenderLabel(gender: string): string {
  const labels: Record<string, string> = {
    unissex: "Unissex",
    masculino: "Masculino",
    feminino: "Feminino",
    masculino_feminino: "Masc. e Fem.",
  };
  return labels[gender] || gender;
}

function getGendersForType(genderType: string): string[] {
  if (genderType === "masculino_feminino") return ["masculino", "feminino"];
  return [genderType];
}

export default function LojaAdmin() {
  const { hasMarketingPanel } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItemAdmin | null>(null);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ShopCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);
  const [categoryImageChanged, setCategoryImageChanged] = useState(false);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);
  const [managingItem, setManagingItem] = useState<ShopItemAdmin | null>(null);
  const [manageTab, setManageTab] = useState<"images" | "sizes">("images");
  const [uploadingGender, setUploadingGender] = useState<string>("unissex");
  const [newSizeGender, setNewSizeGender] = useState<string>("unissex");
  const [newSizeName, setNewSizeName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Size chart modal state
  const [sizeChartModal, setSizeChartModal] = useState<{
    open: boolean;
    itemId: number;
    gender: string;
    size: string;
    width: string;
    length: string;
    sleeve: string;
    shoulder: string;
    hydrated: boolean; // Flag to track if data has been loaded
  } | null>(null);

  // Promo code states
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    isActive: true,
    maxUses: "",
  });

  const hasAccess = hasMarketingPanel;

  const { data: items, isLoading } = useQuery<ShopItemAdmin[]>({
    queryKey: ["/api/admin/shop/items"],
    enabled: hasAccess,
  });

  const { data: categories } = useQuery<ShopCategory[]>({
    queryKey: ["/api/admin/shop/categories"],
    enabled: hasAccess,
  });

  const { data: promoCodes, isLoading: isLoadingPromos } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/shop/promo-codes"],
    enabled: hasAccess,
  });

  // Query for size charts when managing item (not when modal opens)
  const { data: sizeCharts } = useQuery<{ id: number; itemId: number; gender: string; size: string; width: number | null; length: number | null; sleeve: number | null; shoulder: number | null }[]>({
    queryKey: ["/api/admin/shop/items", managingItem?.id, "size-charts"],
    enabled: !!managingItem?.id,
  });

  // Helper function to open size chart modal with existing data
  const openSizeChartModal = (itemId: number, gender: string, size: string) => {
    const existingChart = sizeCharts?.find(
      c => c.gender === gender && c.size === size
    );
    const hasData = !!existingChart;
    setSizeChartModal({
      open: true,
      itemId,
      gender,
      size,
      width: existingChart?.width?.toString() || "",
      length: existingChart?.length?.toString() || "",
      sleeve: existingChart?.sleeve?.toString() || "",
      shoulder: existingChart?.shoulder?.toString() || "",
      hydrated: hasData, // Mark as hydrated if data was found synchronously
    });
  };

  // Update modal when sizeCharts data loads (for async fetch after modal opens)
  useEffect(() => {
    if (sizeChartModal?.open && !sizeChartModal.hydrated && sizeCharts) {
      const existingChart = sizeCharts.find(
        c => c.gender === sizeChartModal.gender && c.size === sizeChartModal.size
      );
      if (existingChart) {
        // Only hydrate once - set values from server
        setSizeChartModal(prev => prev ? {
          ...prev,
          width: existingChart.width?.toString() || "",
          length: existingChart.length?.toString() || "",
          sleeve: existingChart.sleeve?.toString() || "",
          shoulder: existingChart.shoulder?.toString() || "",
          hydrated: true,
        } : null);
      } else {
        // No chart exists for this size - mark as hydrated to allow user input
        setSizeChartModal(prev => prev ? { ...prev, hydrated: true } : null);
      }
    }
  }, [sizeCharts, sizeChartModal?.open, sizeChartModal?.hydrated, sizeChartModal?.gender, sizeChartModal?.size]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      categoryId: 0,
      genderType: "unissex",
      hasSize: true,
      isAvailable: true,
      isPreOrder: false,
      isFeatured: false,
      featuredOrder: undefined,
      allowInstallments: false,
      maxInstallments: 3,
      stockQuantity: null,
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        description: editingItem.description || "",
        price: editingItem.price,
        categoryId: editingItem.categoryId,
        genderType: editingItem.genderType,
        hasSize: editingItem.hasSize,
        isAvailable: editingItem.isAvailable,
        isPreOrder: editingItem.isPreOrder,
        isFeatured: editingItem.isFeatured,
        featuredOrder: editingItem.featuredOrder ?? undefined,
        allowInstallments: editingItem.allowInstallments ?? false,
        maxInstallments: editingItem.maxInstallments ?? 3,
        stockQuantity: editingItem.stockQuantity ?? null,
      });
      setPriceDisplay(formatCurrencyInput(editingItem.price));
    } else {
      form.reset({
        name: "",
        description: "",
        price: 0,
        categoryId: categories?.[0]?.id || 0,
        genderType: "unissex",
        hasSize: true,
        isAvailable: true,
        isPreOrder: false,
        isFeatured: false,
        featuredOrder: undefined,
        allowInstallments: false,
        maxInstallments: 3,
        stockQuantity: null,
      });
      setPriceDisplay("");
    }
  }, [editingItem, form, categories]);

  const createMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      return apiRequest("POST", "/api/admin/shop/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Item criado", description: "O item foi adicionado à loja." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o item.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ItemFormValues & { id: number }) => {
      return apiRequest("PATCH", `/api/admin/shop/items/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      setEditingItem(null);
      toast({ title: "Item atualizado", description: "As alterações foram salvas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o item.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/shop/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Item removido", description: "O item foi excluído da loja." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o item.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/shop/items/${id}/publish`);
      const data = await res.json();
      return { ...data, id };
    },
    onSuccess: (data: any) => {
      // Optimistic update: immediately update the cache to show isPublished: true
      queryClient.setQueryData(["/api/admin/shop/items"], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item => 
          item.id === data.id ? { ...item, isPublished: true } : item
        );
      });
      // Also invalidate to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ 
        title: "Produto publicado!", 
        description: `${data.pushSent} notificações e ${data.emailsSent} emails enviados.`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro", 
        description: error?.message || "Não foi possível publicar o produto.", 
        variant: "destructive" 
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; imageData: string | null }) => {
      return apiRequest("POST", "/api/admin/shop/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/categories"] });
      setIsCategoryOpen(false);
      resetCategoryForm();
      toast({ title: "Categoria criada", description: "A nova categoria foi adicionada." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar a categoria.", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; imageData?: string | null } }) => {
      return apiRequest("PATCH", `/api/admin/shop/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/categories"] });
      setIsCategoryOpen(false);
      resetCategoryForm();
      toast({ title: "Categoria atualizada", description: "As alterações foram salvas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar a categoria.", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/shop/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/categories"] });
      toast({ title: "Categoria excluída", description: "A categoria foi removida." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a categoria. Verifique se não há produtos vinculados.", variant: "destructive" });
    },
  });

  const createPromoMutation = useMutation({
    mutationFn: async (data: typeof promoForm) => {
      return apiRequest("POST", "/api/admin/shop/promo-codes", {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountType === "percentage" 
          ? parseFloat(data.discountValue) 
          : parseCurrencyInput(data.discountValue),
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/promo-codes"] });
      setIsPromoOpen(false);
      resetPromoForm();
      toast({ title: "Cupom criado", description: "O código promocional foi adicionado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Não foi possível criar o cupom.", variant: "destructive" });
    },
  });

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof promoForm }) => {
      return apiRequest("PATCH", `/api/admin/shop/promo-codes/${id}`, {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountType === "percentage" 
          ? parseFloat(data.discountValue) 
          : parseCurrencyInput(data.discountValue),
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/promo-codes"] });
      setEditingPromo(null);
      resetPromoForm();
      toast({ title: "Cupom atualizado", description: "As alterações foram salvas." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Não foi possível atualizar o cupom.", variant: "destructive" });
    },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/shop/promo-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/promo-codes"] });
      toast({ title: "Cupom excluído", description: "O código promocional foi removido." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o cupom.", variant: "destructive" });
    },
  });

  const resetPromoForm = () => {
    setPromoForm({
      code: "",
      discountType: "percentage",
      discountValue: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      isActive: true,
      maxUses: "",
    });
  };

  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryImage(null);
    setCategoryImageChanged(false);
    setEditingCategory(null);
  };

  const openEditCategory = (category: ShopCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryImage(category.imageData);
    setCategoryImageChanged(false);
    setIsCategoryOpen(true);
  };

  const handleCategoryImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`/api/upload?uploadType=banner`, {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const data = await response.json();
      setNewCategoryImage(data.url);
      setCategoryImageChanged(true);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível processar a imagem.", variant: "destructive" });
    }
  };

  const handleRemoveCategoryImage = () => {
    setNewCategoryImage(null);
    setCategoryImageChanged(true);
  };

  const openEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountType === "percentage" 
        ? promo.discountValue.toString() 
        : formatCurrencyInput(promo.discountValue),
      categoryId: promo.categoryId?.toString() || "",
      startDate: promo.startDate.split("T")[0],
      endDate: promo.endDate.split("T")[0],
      isActive: promo.isActive,
      maxUses: promo.maxUses?.toString() || "",
    });
  };

  const uploadImageMutation = useMutation({
    mutationFn: async ({ itemId, gender, files }: { itemId: number; gender: string; files: File[] }) => {
      const formData = new FormData();
      // Append files in order (respects selection order)
      for (const file of files) {
        formData.append("images", file);
      }
      formData.append("gender", gender);
      
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/admin/shop/items/${itemId}/images`, {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      const count = variables.files.length;
      toast({ 
        title: count > 1 ? "Imagens enviadas" : "Imagem enviada", 
        description: count > 1 ? `${count} imagens foram adicionadas ao item.` : "A imagem foi adicionada ao item." 
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível enviar a(s) imagem(ns).", variant: "destructive" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ itemId, imageId }: { itemId: number; imageId: number }) => {
      return apiRequest("DELETE", `/api/admin/shop/items/${itemId}/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Imagem removida", description: "A imagem foi excluída." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover a imagem.", variant: "destructive" });
    },
  });

  const reorderImagesMutation = useMutation({
    mutationFn: async ({ itemId, imageIds }: { itemId: number; imageIds: number[] }) => {
      return apiRequest("PATCH", `/api/admin/shop/items/${itemId}/images/reorder`, { imageIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Ordem atualizada", description: "A ordem das imagens foi atualizada." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível reordenar as imagens.", variant: "destructive" });
    },
  });

  const uploadBannerMutation = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file); // Changed from bannerImage to file to match /api/upload
      
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/upload?uploadType=banner`, {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || "Upload failed");
      }
      const data = await response.json();
      
      // After uploading the file, update the item's bannerImageData
      return apiRequest("PATCH", `/api/admin/shop/items/${itemId}`, {
        bannerImageData: data.url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Banner enviado", description: "A imagem de banner foi atualizada." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível enviar o banner.", variant: "destructive" });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/admin/shop/items/${itemId}/banner`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Banner removido", description: "A imagem de banner foi excluida." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Nao foi possivel remover o banner.", variant: "destructive" });
    },
  });

  const addSizeMutation = useMutation({
    mutationFn: async ({ itemId, gender, size }: { itemId: number; gender: string; size: string }) => {
      return apiRequest("POST", `/api/admin/shop/items/${itemId}/sizes`, { gender, size });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      toast({ title: "Tamanho adicionado", description: "O tamanho foi adicionado ao item." });
      // Open size chart modal after adding size (new size, no existing data)
      openSizeChartModal(variables.itemId, variables.gender, variables.size);
      setNewSizeName("");
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar o tamanho.", variant: "destructive" });
    },
  });

  const upsertSizeChartMutation = useMutation({
    mutationFn: async (data: { itemId: number; gender: string; size: string; width?: number; length?: number; sleeve?: number; shoulder?: number }) => {
      return apiRequest("POST", `/api/admin/shop/items/${data.itemId}/size-charts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items"] });
      // Also invalidate size-charts query to refresh cached data
      if (managingItem) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/items", managingItem.id, "size-charts"] });
      }
      setSizeChartModal(null);
      toast({ title: "Dimensoes salvas", description: "As dimensoes do tamanho foram salvas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Nao foi possivel salvar as dimensoes.", variant: "destructive" });
    },
  });

  if (!hasAccess) {
    setLocation("/admin");
    return null;
  }

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = (data: ItemFormValues) => {
    const featuredOrder = data.isFeatured ? (data.featuredOrder ?? undefined) : undefined;
    const maxInstallments = data.allowInstallments ? (data.maxInstallments ?? 3) : 1;
    const payload = {
      ...data,
      featuredOrder,
      maxInstallments,
    };
    if (editingItem) {
      updateMutation.mutate({ ...payload, id: editingItem.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0 && managingItem) {
      // Convert FileList to array maintaining selection order
      const filesArray = Array.from(fileList);
      
      if (filesArray.length > 10) {
        toast({ title: "Limite excedido", description: "Maximo de 10 imagens por upload.", variant: "destructive" });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      uploadImageMutation.mutate({
        itemId: managingItem.id,
        gender: uploadingGender,
        files: filesArray,
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddSize = () => {
    if (managingItem && newSizeName.trim()) {
      addSizeMutation.mutate({
        itemId: managingItem.id,
        gender: newSizeGender,
        size: newSizeName.trim(),
      });
    }
  };

  const currentItemData = managingItem 
    ? items?.find(i => i.id === managingItem.id) 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <section 
        className="relative text-white py-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
        }}
      >
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23f97316' stroke-width='1.5'%3E%3Cpath d='M10 10 L25 5 L35 18 L28 25 Z' opacity='0.5'/%3E%3Cpath d='M80 15 L100 10 L95 35 L75 30 Z' opacity='0.4'/%3E%3Cpath d='M45 70 L65 62 L72 85 L52 90 Z' opacity='0.45'/%3E%3Cpath d='M15 90 L30 82 L38 100 L22 108 Z' opacity='0.35'/%3E%3Cpath d='M85 80 L105 72 L112 95 L92 102 Z' opacity='0.4'/%3E%3Ccircle cx='60' cy='35' r='4' fill='%23f97316' opacity='0.3'/%3E%3Ccircle cx='25' cy='55' r='3' fill='%23f97316' opacity='0.35'/%3E%3Ccircle cx='95' cy='50' r='3' fill='%23f97316' opacity='0.3'/%3E%3Cpath d='M5 45 Q20 38 40 45 T75 45' stroke='%23f97316' opacity='0.25'/%3E%3Cpath d='M60 105 Q80 98 105 105' stroke='%23f97316' opacity='0.3'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div 
          className="absolute top-0 right-0 w-64 h-64 opacity-20"
          style={{
            background: 'radial-gradient(circle, #f97316 0%, transparent 60%)',
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-48 h-48 opacity-15"
          style={{
            background: 'radial-gradient(circle, #f97316 0%, transparent 60%)',
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin">
              <Button 
                variant="ghost" 
                className="mb-4 text-white/80 gap-2"
                data-testid="button-back-admin"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <img src="/emaustore-logo-dark.png" alt="Emaústore" className="h-8 w-auto drop-shadow-lg mb-2" />
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-shop-admin-title">
                  Gestão da Loja
                </h1>
                <p className="text-orange-300">
                  Marketing - Gerenciar produtos e categorias
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href="/admin/marketing/pedidos">
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/10 border-orange-400/50 text-white"
                    data-testid="button-manage-orders"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Pedidos
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryOpen(true)}
                  className="gap-2 bg-white/10 border-orange-400/50 text-white"
                  data-testid="button-add-category"
                >
                  <FolderPlus className="h-4 w-4" />
                  Nova Categoria
                </Button>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          {/* Categories Section */}
          {categories && categories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Categorias ({categories.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {categories.map((cat) => (
                  <Card key={cat.id} className="flex-shrink-0 w-40 overflow-hidden">
                    <div className="aspect-square bg-muted relative flex items-center justify-center">
                      {cat.imageData ? (
                        <img 
                          src={cat.imageData}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="font-medium text-sm truncate mb-2" data-testid={`text-category-name-${cat.id}`}>
                        {cat.name}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => openEditCategory(cat)}
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => {
                            if (confirm(`Deseja excluir a categoria "${cat.name}"?`)) {
                              deleteCategoryMutation.mutate(cat.id);
                            }
                          }}
                          disabled={deleteCategoryMutation.isPending}
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-items"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Tente outra busca" : "Adicione o primeiro produto da loja"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {item.images && item.images.length > 0 ? (
                      <img 
                        src={item.images[0].imageData} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {item.isPublished ? (
                        <Badge className="text-xs bg-green-500 text-white hover:bg-green-600">
                          Publicado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Rascunho
                        </Badge>
                      )}
                      {item.isFeatured && (
                        <Badge className="text-xs bg-yellow-400 text-zinc-950 hover:bg-yellow-500">
                          Destaque
                        </Badge>
                      )}
                      {!item.isAvailable && (
                        <Badge variant="destructive" className="text-xs">
                          ESGOTADO
                        </Badge>
                      )}
                      {item.isPreOrder && (
                        <Badge variant="outline" className="text-xs bg-background">
                          Pré-venda
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.category?.name} - {getGenderLabel(item.genderType)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-lg" data-testid={`text-item-price-${item.id}`}>
                        {formatCurrency(item.price)}
                      </span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {item.stockQuantity !== null && (
                          <Badge 
                            variant={item.stockQuantity === 0 ? "destructive" : item.stockQuantity <= 5 ? "secondary" : "outline"}
                            className="text-xs"
                            data-testid={`badge-stock-${item.id}`}
                          >
                            {item.stockQuantity === 0 ? "Sem estoque" : `${item.stockQuantity} un`}
                          </Badge>
                        )}
                        {item.images && (
                          <Badge variant="outline" className="text-xs">
                            {item.images.length} img
                          </Badge>
                        )}
                        {item.sizes && item.hasSize && (
                          <Badge variant="outline" className="text-xs">
                            {item.sizes.length} tam
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!item.isPublished && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => {
                            if (confirm(`Publicar "${item.name}"? Isso enviará notificações e emails para todos os membros.`)) {
                              publishMutation.mutate(item.id);
                            }
                          }}
                          disabled={publishMutation.isPending}
                          data-testid={`button-publish-item-${item.id}`}
                        >
                          {publishMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Publicar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className={!item.isPublished ? "gap-1" : "flex-1 gap-1"}
                        onClick={() => {
                          setManagingItem(item);
                          setManageTab("images");
                          setUploadingGender(getGendersForType(item.genderType)[0]);
                        }}
                        data-testid={`button-manage-item-${item.id}`}
                      >
                        <ImagePlus className="h-3 w-3" />
                        Gerenciar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItem(item)}
                        data-testid={`button-edit-item-${item.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Excluir este item?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        data-testid={`button-delete-item-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Cupons de Desconto</h2>
                <p className="text-sm text-muted-foreground">Gerencie códigos promocionais</p>
              </div>
            </div>
            <Button onClick={() => setIsPromoOpen(true)} className="gap-2" data-testid="button-add-promo">
              <Plus className="h-4 w-4" />
              Novo Cupom
            </Button>
          </div>

          {isLoadingPromos ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !promoCodes?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">Nenhum cupom cadastrado</h3>
                <p className="text-sm text-muted-foreground">Crie um cupom para oferecer descontos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promoCodes.map((promo) => {
                const isExpired = new Date(promo.endDate) < new Date();
                const isNotStarted = new Date(promo.startDate) > new Date();
                return (
                  <Card key={promo.id} className={!promo.isActive || isExpired ? "opacity-60" : ""}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={promo.isActive && !isExpired ? "default" : "secondary"}>
                            {promo.code}
                          </Badge>
                          {isExpired && <Badge variant="destructive">Expirado</Badge>}
                          {isNotStarted && <Badge variant="outline">Futuro</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditPromo(promo)} data-testid={`button-edit-promo-${promo.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => { if (confirm("Excluir este cupom?")) deletePromoMutation.mutate(promo.id); }}
                            data-testid={`button-delete-promo-${promo.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {promo.discountType === "percentage" 
                              ? `${promo.discountValue}% de desconto`
                              : formatCurrency(promo.discountValue)}
                          </span>
                        </div>
                        {promo.category && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>Categoria: {promo.category.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(promo.startDate).toLocaleDateString("pt-BR")} - {new Date(promo.endDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {promo.maxUses && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-4 w-4" />
                            <span>Usado {promo.usedCount}/{promo.maxUses}x</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog open={isPromoOpen || !!editingPromo} onOpenChange={(open) => { if (!open) { setIsPromoOpen(false); setEditingPromo(null); resetPromoForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            <DialogDescription>
              {editingPromo ? "Atualize as informações do cupom" : "Crie um código promocional de desconto"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promo-code">Código</Label>
              <Input
                id="promo-code"
                placeholder="Ex: VERAO2026"
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                data-testid="input-promo-code"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <Select 
                  value={promoForm.discountType} 
                  onValueChange={(v) => setPromoForm({ ...promoForm, discountType: v as "percentage" | "fixed", discountValue: "" })}
                >
                  <SelectTrigger data-testid="select-promo-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-value">
                  {promoForm.discountType === "percentage" ? "Percentual" : "Valor"}
                </Label>
                <Input
                  id="promo-value"
                  placeholder={promoForm.discountType === "percentage" ? "Ex: 10" : "Ex: 10,00"}
                  value={promoForm.discountValue}
                  onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                  data-testid="input-promo-value"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select 
                value={promoForm.categoryId || "all"} 
                onValueChange={(v) => setPromoForm({ ...promoForm, categoryId: v === "all" ? "" : v })}
              >
                <SelectTrigger data-testid="select-promo-category">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-start">Data Início</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={promoForm.startDate}
                  onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                  data-testid="input-promo-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-end">Data Fim</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={promoForm.endDate}
                  onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                  data-testid="input-promo-end"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-max-uses">Limite de Usos (opcional)</Label>
              <Input
                id="promo-max-uses"
                type="number"
                placeholder="Sem limite"
                value={promoForm.maxUses}
                onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                data-testid="input-promo-max-uses"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="promo-active"
                checked={promoForm.isActive}
                onCheckedChange={(checked) => setPromoForm({ ...promoForm, isActive: checked })}
                data-testid="switch-promo-active"
              />
              <Label htmlFor="promo-active">Cupom ativo</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsPromoOpen(false); setEditingPromo(null); resetPromoForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingPromo) {
                  updatePromoMutation.mutate({ id: editingPromo.id, data: promoForm });
                } else {
                  createPromoMutation.mutate(promoForm);
                }
              }}
              disabled={
                !promoForm.code.trim() || 
                !promoForm.discountValue || 
                !promoForm.startDate || 
                !promoForm.endDate ||
                createPromoMutation.isPending ||
                updatePromoMutation.isPending
              }
              data-testid="button-save-promo"
            >
              {(createPromoMutation.isPending || updatePromoMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingPromo ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryOpen} onOpenChange={(open) => { if (!open) resetCategoryForm(); setIsCategoryOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Edite as informações da categoria" : "Crie uma nova categoria para organizar os produtos"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da categoria</Label>
              <Input
                id="category-name"
                placeholder="Ex: Uniformes"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                data-testid="input-category-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Imagem da categoria (1:1)</Label>
              <p className="text-xs text-muted-foreground">
                Aparece no grid de categorias da home. Recomendado: 400x400px
              </p>
              <input
                ref={categoryImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCategoryImageUpload(file);
                  }
                  if (categoryImageInputRef.current) {
                    categoryImageInputRef.current.value = "";
                  }
                }}
              />
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => categoryImageInputRef.current?.click()}
                  data-testid="button-upload-category-image"
                >
                  <Upload className="h-4 w-4" />
                  {newCategoryImage ? "Trocar imagem" : "Enviar imagem"}
                </Button>
                {newCategoryImage && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveCategoryImage}
                    data-testid="button-remove-category-image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {newCategoryImage && (
                <div className="relative aspect-square w-32 rounded-md overflow-hidden bg-muted mt-2">
                  <img
                    src={newCategoryImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsCategoryOpen(false); resetCategoryForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingCategory) {
                  const updateData: { name?: string; imageData?: string | null } = { name: newCategoryName };
                  if (categoryImageChanged) {
                    updateData.imageData = newCategoryImage;
                  }
                  updateCategoryMutation.mutate({ 
                    id: editingCategory.id, 
                    data: updateData 
                  });
                } else {
                  createCategoryMutation.mutate({ name: newCategoryName, imageData: newCategoryImage });
                }
              }}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              data-testid="button-save-category"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCategory ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingItem} onOpenChange={(open) => !open && setManagingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar: {managingItem?.name}</DialogTitle>
            <DialogDescription>
              Adicione imagens e tamanhos ao produto
            </DialogDescription>
          </DialogHeader>

          <Tabs value={manageTab} onValueChange={(v) => setManageTab(v as "images" | "sizes")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="images" className="gap-2">
                <ImagePlus className="h-4 w-4" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="sizes" className="gap-2" disabled={!managingItem?.hasSize}>
                <Ruler className="h-4 w-4" />
                Tamanhos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="space-y-6 mt-4">
              {/* Banner Image Section - Available for all items */}
              {managingItem && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-sm font-medium">Imagem do Banner</Label>
                      <p className="text-xs text-muted-foreground">
                        Aparece no carrossel da home. Recomendado: 1200x600px
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && managingItem) {
                            uploadBannerMutation.mutate({ itemId: managingItem.id, file });
                          }
                          if (bannerInputRef.current) {
                            bannerInputRef.current.value = "";
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadBannerMutation.isPending}
                        data-testid="button-upload-banner"
                      >
                        {uploadBannerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {currentItemData?.bannerImageData ? "Trocar" : "Enviar"}
                      </Button>
                      {currentItemData?.bannerImageData && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteBannerMutation.mutate(managingItem.id)}
                          disabled={deleteBannerMutation.isPending}
                          data-testid="button-delete-banner"
                        >
                          {deleteBannerMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {currentItemData?.bannerImageData ? (
                    <div className="relative aspect-[2/1] rounded-md overflow-hidden bg-muted">
                      <img
                        src={currentItemData.bannerImageData}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/1] rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      Nenhum banner definido
                    </div>
                  )}
                </div>
              )}

              {/* Product Images Section */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Imagens do Produto</Label>
                <div className="flex items-center gap-2">
                  <Select value={uploadingGender} onValueChange={setUploadingGender}>
                    <SelectTrigger className="w-40" data-testid="select-upload-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {managingItem && getGendersForType(managingItem.genderType).map((g) => (
                        <SelectItem key={g} value={g}>{getGenderLabel(g)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    className="gap-2 flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImageMutation.isPending}
                    data-testid="button-upload-image"
                  >
                    {uploadImageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Enviar Imagens
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Selecione ate 10 imagens por vez. Recomendado: 800x800px. A ordem de selecao sera mantida.
                </p>
              </div>

              <div className="space-y-3">
                {managingItem && getGendersForType(managingItem.genderType).map((gender) => {
                  const genderImages = currentItemData?.images?.filter(img => img.gender === gender).sort((a, b) => a.sortOrder - b.sortOrder) || [];
                  
                  const handleMoveImage = (imageId: number, direction: 'up' | 'down') => {
                    const currentIndex = genderImages.findIndex(img => img.id === imageId);
                    if (currentIndex === -1) return;
                    
                    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
                    if (newIndex < 0 || newIndex >= genderImages.length) return;
                    
                    const newOrder = [...genderImages];
                    const temp = newOrder[currentIndex];
                    newOrder[currentIndex] = newOrder[newIndex];
                    newOrder[newIndex] = temp;
                    
                    reorderImagesMutation.mutate({
                      itemId: managingItem.id,
                      imageIds: newOrder.map(img => img.id)
                    });
                  };
                  
                  return (
                    <div key={gender} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {getGenderLabel(gender)} ({genderImages.length}/5)
                      </Label>
                      {genderImages.length > 0 ? (
                        <div className="grid grid-cols-5 gap-2">
                          {genderImages.map((img, index) => (
                            <div key={img.id} className="relative aspect-square rounded-md bg-muted">
                              <img 
                                src={img.imageData} 
                                alt="" 
                                className="w-full h-full object-cover rounded-md"
                              />
                              <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-1">
                                <div className="flex flex-col gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-5 w-5"
                                    onClick={() => handleMoveImage(img.id, 'up')}
                                    disabled={index === 0 || reorderImagesMutation.isPending}
                                    data-testid={`button-move-up-image-${img.id}`}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-5 w-5"
                                    onClick={() => handleMoveImage(img.id, 'down')}
                                    disabled={index === genderImages.length - 1 || reorderImagesMutation.isPending}
                                    data-testid={`button-move-down-image-${img.id}`}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-6 w-6"
                                  onClick={() => deleteImageMutation.mutate({ 
                                    itemId: managingItem.id, 
                                    imageId: img.id 
                                  })}
                                  data-testid={`button-delete-image-${img.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">
                          Nenhuma imagem adicionada
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="sizes" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Select value={newSizeGender} onValueChange={setNewSizeGender}>
                  <SelectTrigger className="w-40" data-testid="select-size-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {managingItem && getGendersForType(managingItem.genderType).map((g) => (
                      <SelectItem key={g} value={g}>{getGenderLabel(g)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ex: P, M, G, GG"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  className="flex-1"
                  data-testid="input-size-name"
                />
                <Button
                  onClick={handleAddSize}
                  disabled={!newSizeName.trim() || addSizeMutation.isPending}
                  data-testid="button-add-size"
                >
                  {addSizeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                {managingItem && getGendersForType(managingItem.genderType).map((gender) => {
                  const genderSizes = currentItemData?.sizes?.filter(s => s.gender === gender) || [];
                  return (
                    <div key={gender} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {getGenderLabel(gender)}
                      </Label>
                      {genderSizes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {genderSizes.map((size) => (
                            <Badge 
                              key={size.id} 
                              variant="secondary" 
                              className="gap-1 cursor-pointer"
                              onClick={() => {
                                if (managingItem) {
                                  openSizeChartModal(managingItem.id, size.gender, size.size);
                                }
                              }}
                              data-testid={`badge-size-${size.size}`}
                            >
                              {size.size}
                              <Ruler className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Nenhum tamanho adicionado
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingItem(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen || !!editingItem} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingItem(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize as informações do produto" : "Preencha os dados do novo produto"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome do produto" 
                        {...field} 
                        data-testid="input-item-name"
                      />
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do produto (máx 500 caracteres)" 
                        {...field} 
                        maxLength={500}
                        data-testid="input-item-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="text"
                          className="pl-10"
                          placeholder="0,00"
                          value={priceDisplay}
                          onChange={(e) => {
                            setPriceDisplay(e.target.value);
                            field.onChange(parseCurrencyInput(e.target.value));
                          }}
                          data-testid="input-item-price"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-item-category">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
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
                name="genderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-gender">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unissex">Unissex</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="hasSize"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <FormLabel>Possui tamanhos</FormLabel>
                        <FormDescription className="text-xs">
                          Habilitar seleção de tamanho
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-has-size"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className={`flex items-center justify-between rounded-md border p-3 ${!field.value ? "border-red-500/50 bg-red-500/10" : ""}`}>
                      <div>
                        <FormLabel className={!field.value ? "text-red-600 dark:text-red-400" : ""}>
                          {!field.value ? "ESGOTADO" : "Disponível na loja"}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {!field.value ? "Produto indisponível para compra" : "Exibir para compra"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-available"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPreOrder"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <FormLabel>Pré-venda</FormLabel>
                        <FormDescription className="text-xs">
                          Produto ainda não disponível
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-preorder"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3 border-yellow-500/30 bg-yellow-500/5">
                      <div>
                        <FormLabel className="text-yellow-600 dark:text-yellow-400">Destaque no Banner</FormLabel>
                        <FormDescription className="text-xs">
                          Exibir no carousel da loja
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-featured"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("isFeatured") && (
                  <FormField
                    control={form.control}
                    name="featuredOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordem no Banner</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? undefined : parseInt(val, 10));
                            }}
                            data-testid="input-featured-order"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Menor numero aparece primeiro
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="allowInstallments"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3 border-blue-500/30 bg-blue-500/5">
                      <div>
                        <FormLabel className="text-blue-600 dark:text-blue-400">Permitir Parcelamento PIX</FormLabel>
                        <FormDescription className="text-xs">
                          Cliente pode pagar em parcelas
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-allow-installments"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("allowInstallments") && (
                  <FormField
                    control={form.control}
                    name="maxInstallments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximo de Parcelas</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="3"
                            value={field.value?.toString() ?? ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              if (val === "") {
                                field.onChange(undefined);
                              } else {
                                const num = parseInt(val, 10);
                                field.onChange(Math.min(12, Math.max(2, num)));
                              }
                            }}
                            data-testid="input-max-installments"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          De 2 a 12 parcelas (vencimento dia 10)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade em Estoque</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Deixe vazio para sem controle"
                          value={field.value?.toString() ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (val === "") {
                              field.onChange(null);
                            } else {
                              field.onChange(parseInt(val, 10));
                            }
                          }}
                          data-testid="input-stock-quantity"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Deixe vazio para nao controlar estoque. Quando chegar a 0, o item sera marcado como esgotado automaticamente.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingItem(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-item"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingItem ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Size Chart Modal */}
      <Dialog open={!!sizeChartModal?.open} onOpenChange={(open) => {
        if (!open) setSizeChartModal(null);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dimensoes do Tamanho {sizeChartModal?.size}</DialogTitle>
            <DialogDescription>
              Preencha as medidas em centimetros (opcional)
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="width">Largura (cm)</Label>
              <Input
                id="width"
                type="number"
                step="0.5"
                placeholder="Ex: 50"
                value={sizeChartModal?.width || ""}
                onChange={(e) => sizeChartModal && setSizeChartModal({
                  ...sizeChartModal,
                  width: e.target.value
                })}
                data-testid="input-size-width"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">Comprimento (cm)</Label>
              <Input
                id="length"
                type="number"
                step="0.5"
                placeholder="Ex: 70"
                value={sizeChartModal?.length || ""}
                onChange={(e) => sizeChartModal && setSizeChartModal({
                  ...sizeChartModal,
                  length: e.target.value
                })}
                data-testid="input-size-length"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleeve">Manga (cm)</Label>
              <Input
                id="sleeve"
                type="number"
                step="0.5"
                placeholder="Ex: 20"
                value={sizeChartModal?.sleeve || ""}
                onChange={(e) => sizeChartModal && setSizeChartModal({
                  ...sizeChartModal,
                  sleeve: e.target.value
                })}
                data-testid="input-size-sleeve"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoulder">Ombro (cm)</Label>
              <Input
                id="shoulder"
                type="number"
                step="0.5"
                placeholder="Ex: 45"
                value={sizeChartModal?.shoulder || ""}
                onChange={(e) => sizeChartModal && setSizeChartModal({
                  ...sizeChartModal,
                  shoulder: e.target.value
                })}
                data-testid="input-size-shoulder"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSizeChartModal(null)}>
              Pular
            </Button>
            <Button
              onClick={() => {
                if (sizeChartModal) {
                  upsertSizeChartMutation.mutate({
                    itemId: sizeChartModal.itemId,
                    gender: sizeChartModal.gender,
                    size: sizeChartModal.size,
                    width: sizeChartModal.width ? parseFloat(sizeChartModal.width) : undefined,
                    length: sizeChartModal.length ? parseFloat(sizeChartModal.length) : undefined,
                    sleeve: sizeChartModal.sleeve ? parseFloat(sizeChartModal.sleeve) : undefined,
                    shoulder: sizeChartModal.shoulder ? parseFloat(sizeChartModal.shoulder) : undefined,
                  });
                }
              }}
              disabled={upsertSizeChartMutation.isPending}
              data-testid="button-save-size-chart"
            >
              {upsertSizeChartMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
