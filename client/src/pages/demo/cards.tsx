import { useState } from "react";
import { CollectibleCard, CollectibleCardModal, type CardRarity } from "@/components/study/CollectibleCard";
import magazineCover1 from "@assets/stock_images/magazine_cover_fashi_38881411.jpg";
import magazineCover2 from "@assets/stock_images/magazine_cover_fashi_2a92c38f.jpg";

const demoCards = [
  { id: 1, name: "Card Comum", rarity: "common" as CardRarity, description: "Exemplo de card comum sem efeitos" },
  { id: 2, name: "Card Raro", rarity: "rare" as CardRarity, description: "Exemplo de card raro com efeito de raio azul" },
  { id: 3, name: "Card Épico", rarity: "epic" as CardRarity, description: "Exemplo de card épico com efeito neon roxo" },
  { id: 4, name: "Card Lendário", rarity: "legendary" as CardRarity, description: "Exemplo de card lendário com efeito de chama" },
];

const eventCards = [
  { id: 1, name: "Acampamento", rarity: "common" as CardRarity, description: "Card de evento comum", imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=600&fit=crop" },
  { id: 2, name: "Retiro Jovem", rarity: "rare" as CardRarity, description: "Card de evento raro", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop" },
  { id: 3, name: "Congresso", rarity: "epic" as CardRarity, description: "Card de evento épico", imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=600&fit=crop" },
  { id: 4, name: "Jubileu UMP", rarity: "legendary" as CardRarity, description: "Card de evento lendário", imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=600&fit=crop" },
];

const magazineCards = [
  { id: 1, name: "Revista Comum", rarity: "common" as CardRarity, description: "Card de revista comum", imageUrl: magazineCover1 },
  { id: 2, name: "Revista Rara", rarity: "rare" as CardRarity, description: "Card de revista raro", imageUrl: magazineCover2 },
  { id: 3, name: "Revista Épica", rarity: "epic" as CardRarity, description: "Card de revista épico", imageUrl: magazineCover1 },
  { id: 4, name: "Revista Lendária", rarity: "legendary" as CardRarity, description: "Card de revista lendário", imageUrl: magazineCover2 },
];

type DemoCard = {
  id: number;
  name: string;
  rarity: CardRarity;
  description: string;
  sourceType?: "season" | "event" | "magazine";
  imageUrl?: string;
};

export default function DemoCardsPage() {
  const [selectedCard, setSelectedCard] = useState<DemoCard | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Demo - Efeitos de Cards</h1>
        <p className="text-gray-400 text-center mb-8">Clique em um card para ver em tamanho maior</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center overflow-visible p-8">
          {demoCards.map((card) => (
            <div key={card.id} className="flex flex-col items-center gap-2 overflow-visible">
              <CollectibleCard
                name={card.name}
                rarity={card.rarity}
                size="md"
                onClick={() => setSelectedCard(card)}
              />
              <span className="text-sm text-gray-300 capitalize">{card.rarity}</span>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">Tamanho Grande (Modal)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center overflow-visible p-8">
            {demoCards.map((card) => (
              <div key={`lg-${card.id}`} className="overflow-visible">
                <CollectibleCard
                  name={card.name}
                  rarity={card.rarity}
                  size="lg"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">Cards de Evento (Novo Design)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center overflow-visible p-8">
            {eventCards.map((card) => (
              <div key={`event-${card.id}`} className="flex flex-col items-center gap-2 overflow-visible">
                <CollectibleCard
                  name={card.name}
                  rarity={card.rarity}
                  imageUrl={card.imageUrl}
                  size="event"
                  sourceType="event"
                  onClick={() => setSelectedCard({ ...card, sourceType: "event" })}
                />
                <span className="text-sm text-gray-300 capitalize">{card.rarity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">Cards de Revista (Novo Design)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center overflow-visible p-8">
            {magazineCards.map((card) => (
              <div key={`magazine-${card.id}`} className="flex flex-col items-center gap-2 overflow-visible">
                <CollectibleCard
                  name={card.name}
                  rarity={card.rarity}
                  imageUrl={card.imageUrl}
                  size="magazine"
                  sourceType="magazine"
                  onClick={() => setSelectedCard({ ...card, sourceType: "magazine" })}
                />
                <span className="text-sm text-gray-300 capitalize">{card.rarity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedCard && (
        <CollectibleCardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          card={{
            name: selectedCard.name,
            rarity: selectedCard.rarity,
            description: selectedCard.description,
            sourceType: selectedCard.sourceType || "season",
            imageUrl: selectedCard.imageUrl || null,
          }}
        />
      )}
    </div>
  );
}
