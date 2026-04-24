import React, { useEffect, useState, useRef } from "react";
import { Reel } from "../types";
import { api } from "../services/api";
import { Heart, Share2, Music2, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";

interface ReelsScreenProps {
  onCarClick: (id: number) => void;
  onDealerClick: (id: number) => void;
  initialReelId?: number | null;
}

export const ReelsScreen: React.FC<ReelsScreenProps> = ({ onCarClick, onDealerClick, initialReelId }) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    api.reels.getAll().then(data => {
      setReels(data);
      if (initialReelId) {
        const index = data.findIndex(r => r.id === initialReelId);
        if (index !== -1) {
          setActiveIndex(index);
          // We need to wait for the DOM to update before scrolling
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({
                top: index * containerRef.current.clientHeight,
                behavior: 'instant'
              });
            }
          }, 0);
        }
      }
    });
  }, [initialReelId]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (video) {
        if (i === activeIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [activeIndex, reels]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    setActiveIndex(index);
    if (reels[index]) {
      api.reels.view(reels[index].id);
    }
  };

  const handleReelTap = (reel: Reel) => {
    if (reel.car_id) {
      onCarClick(reel.car_id);
    } else {
      onDealerClick(reel.dealer_id);
    }
  };

  const handleLike = async (reelId: number) => {
    // Optimistic update
    setReels(prev => prev.map(r => {
      if (r.id === reelId) {
        const isLiked = !!r.is_liked;
        return {
          ...r,
          is_liked: !isLiked,
          likes: isLiked ? Math.max(0, r.likes - 1) : r.likes + 1
        };
      }
      return r;
    }));

    try {
      await api.reels.like(reelId);
    } catch (e) {
      // Rollback on error
      api.reels.getAll().then(setReels);
    }
  };

  const handleShare = async (reel: Reel) => {
    const shareUrl = `${window.location.origin}/reels/${reel.id}`;
    const carTitle = reel.make && reel.model ? `${reel.make} ${reel.model}` : 'Souq Cars';

    try {
      if (navigator.share) {
        await navigator.share({
          title: carTitle,
          text: "Check this car on Souq Cars",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied");
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error("Error sharing", e);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-white no-scrollbar"
    >
      {reels.map((reel, i) => (
        <div 
          key={reel.id} 
          className="h-screen w-full snap-start relative flex items-center justify-center overflow-hidden"
          onClick={() => handleReelTap(reel)}
        >
          {/* Video Placeholder / Actual Video */}
          <video
            ref={el => videoRefs.current[i] = el}
            src={reel.video_url}
            className="w-full h-full object-cover"
            loop
            playsInline
            controls
            preload="metadata"
            onClick={(e) => {
              e.stopPropagation();
              const video = e.currentTarget;
              if (video.paused) {
                video.play().catch(() => {});
              } else {
                video.pause();
              }
            }}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

          {/* Content */}
          <div className="absolute bottom-24 left-6 right-20 text-white">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={i === activeIndex ? { opacity: 1, x: 0 } : {}}
            >
              <div className="flex items-center gap-3 mb-4">
                <img src={reel.dealer_logo} className="w-10 h-10 rounded-full border border-white/20 object-cover" />
                <span className="font-black text-sm shadow-sm">{reel.dealer_name}</span>
              </div>
              {reel.make && reel.model && (
                <h3 className="text-xl font-black mb-1">{reel.make} {reel.model}</h3>
              )}
              <p className="text-sm font-medium text-white/80 mb-4">{reel.caption}</p>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md w-fit px-3 py-2 rounded-xl border border-white/10">
                <Music2 size={14} />
                <span className="text-xs font-bold">Original Audio</span>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Actions */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => handleLike(reel.id)}
                className={`p-3 backdrop-blur-xl rounded-full border transition-all ${
                  reel.is_liked 
                    ? "bg-red-500 text-white border-red-500" 
                    : "bg-white/10 text-white border-white/20"
                }`}
              >
                <Heart size={24} fill={reel.is_liked ? "currentColor" : "none"} />
              </button>
              <span className="text-white text-[10px] font-bold">{reel.likes}</span>
            </div>
            
            <button 
              onClick={() => handleShare(reel)}
              className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/20"
            >
              <Share2 size={24} />
            </button>
            
            {reel.car_id && (
              <button 
                onClick={() => onCarClick(reel.car_id!)}
                className="p-3 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/40"
              >
                <ShoppingBag size={24} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
