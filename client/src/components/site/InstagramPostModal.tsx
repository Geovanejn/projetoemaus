import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Send, Bookmark, ExternalLink, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const logoPath = "/logo.png";

export interface InstagramPostData {
  id: number;
  instagramId?: string;
  caption?: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: string;
  permalink?: string;
  postedAt?: string;
  likesCount?: number;
  commentsCount?: number;
}

interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
}

interface InstagramPostModalProps {
  post: InstagramPostData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export function InstagramPostModal({
  post,
  open,
  onOpenChange,
}: InstagramPostModalProps) {
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && post?.instagramId) {
      setLoadingComments(true);
      fetch(`/api/site/instagram/${post.instagramId}/comments`)
        .then(res => res.json())
        .then(data => {
          setComments(Array.isArray(data) ? data : []);
        })
        .catch(() => setComments([]))
        .finally(() => setLoadingComments(false));
    } else {
      setComments([]);
    }
  }, [open, post?.instagramId]);

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [open]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const isVideo = post?.mediaType === "VIDEO" && post?.videoUrl;

  return (
    <Dialog open={open && post !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] md:max-w-2xl p-0 gap-0 max-h-[95vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>Post do Instagram</DialogTitle>
        </VisuallyHidden>
        {post && (
          <>
            <div className="flex items-center gap-3 p-3 border-b flex-shrink-0">
              <Avatar className="h-8 w-8 ring-2 ring-primary ring-offset-1 ring-offset-background">
                <AvatarImage src={logoPath} alt="UMP Emaús" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">UE</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" data-testid="modal-instagram-handle">umpemaus</p>
                <p className="text-xs text-muted-foreground truncate">Igreja Presbiteriana Emaús</p>
              </div>
              {post.permalink && (
                <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs" data-testid="button-view-on-instagram">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ver no Instagram</span>
                  </Button>
                </a>
              )}
            </div>

            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="relative bg-black">
                {isVideo ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      src={post.videoUrl}
                      poster={post.imageUrl}
                      loop
                      playsInline
                      muted={isMuted}
                      className="w-full max-h-[50vh] object-contain"
                      data-testid="modal-instagram-video"
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm border-0"
                        onClick={togglePlay}
                        data-testid="button-play-pause"
                      >
                        {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm border-0"
                        onClick={toggleMute}
                        data-testid="button-mute"
                      >
                        {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <img
                    src={post.imageUrl}
                    alt={post.caption || "Post do Instagram"}
                    className="w-full max-h-[50vh] object-contain"
                    data-testid="modal-instagram-image"
                  />
                )}
              </div>

              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <Heart className="h-6 w-6" data-testid="button-like" />
                    <MessageCircle className="h-6 w-6" data-testid="button-comment" />
                    <Send className="h-6 w-6" data-testid="button-share" />
                  </div>
                  <Bookmark className="h-6 w-6" data-testid="button-save" />
                </div>
                
                {(post.likesCount !== undefined && post.likesCount > 0) && (
                  <p className="font-semibold text-sm mb-1" data-testid="modal-instagram-likes">
                    {post.likesCount.toLocaleString("pt-BR")} curtidas
                  </p>
                )}
              </div>

              {post.caption && (
                <div className="p-3 border-b">
                  <p className="text-sm" data-testid="modal-instagram-caption">
                    <span className="font-semibold mr-1.5">umpemaus</span>
                    <span className="whitespace-pre-wrap break-words">{post.caption}</span>
                  </p>
                  {post.postedAt && (
                    <p className="text-xs text-muted-foreground mt-2 uppercase">
                      {formatRelativeDate(post.postedAt)}
                    </p>
                  )}
                </div>
              )}

              <div className="p-3">
                <p className="text-sm font-medium mb-3" data-testid="comments-section-title">
                  Comentários {post.commentsCount ? `(${post.commentsCount})` : ""}
                </p>
                
                {loadingComments ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5" data-testid={`comment-${comment.id}`}>
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-muted">
                            {comment.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold mr-1.5">{comment.username}</span>
                            <span className="break-words">{comment.text}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRelativeDate(comment.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comentário ainda
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
