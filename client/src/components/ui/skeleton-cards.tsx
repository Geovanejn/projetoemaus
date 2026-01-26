import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function LessonSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="w-full max-w-md"
        >
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-6 pb-8 bg-gradient-to-b from-amber-400 to-amber-500">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full bg-white/30" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 bg-white/30" />
                <Skeleton className="h-5 w-24 bg-white/30" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {[...Array(9)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-4 flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-2/3" />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function MissionSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function RankingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <div className="flex justify-around mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function StudyHomeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div 
        className="px-4 pt-6 pb-8"
        style={{ background: 'linear-gradient(180deg, #FFC800 0%, #FFD633 100%)' }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full bg-white/30" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 bg-white/30" />
                <Skeleton className="h-5 w-24 bg-white/30" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full bg-white/30" />
              <Skeleton className="h-9 w-9 rounded-full bg-white/30" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Skeleton className="h-10 w-24 rounded-full bg-white/30" />
            <Skeleton className="h-10 w-20 rounded-full bg-white/30" />
            <Skeleton className="h-10 w-20 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <LessonSkeleton />
      </div>
    </div>
  );
}

export function VerseSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 flex-1 rounded-full" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function DevotionalSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-0">
        <div className="grid md:grid-cols-3">
          <div className="relative min-h-[280px] bg-muted">
            <div className="p-8 flex flex-col justify-center h-full space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-16 rounded-xl" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="md:col-span-2 p-6 md:p-8 space-y-4">
            <div className="border-l-4 border-muted-foreground/20 pl-4 py-2 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="w-[280px] md:w-auto overflow-hidden">
      <div className="p-0">
        <div className="flex">
          <div className="relative min-w-[100px] min-h-[140px] bg-muted">
            <div className="h-full flex flex-col items-center justify-center p-3 space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-3 w-6" />
            </div>
          </div>
          <div className="p-4 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function EventsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <EventCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function QuickAccessSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function InstagramGridSkeleton() {
  return (
    <div className="flex gap-2 md:grid md:grid-cols-6">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Skeleton className="w-[120px] md:w-full aspect-square rounded-lg" />
        </motion.div>
      ))}
    </div>
  );
}
