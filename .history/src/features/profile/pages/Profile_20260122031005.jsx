/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  fetchMe,
  fetchUserPosts,
  likePost,
  commentOnPost,
  deleteComment,
  deletePost,
} from "@/api/authApi";
import { fetchMySeedPrices, deleteSeedPrice, createPost } from "@/api/authApi";

import ProfileOverview from "../components/ProfileOverview";
import ProfileSidebar from "../components/ProfileSidebar";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";
import PostComposerModalNew from "../components/PostComposerModalNew";
import FollowListModal from "../components/FollowListModal";
import AllPostsModal from "../components/AllPostsModal";
import { LiquedLoader } from "@/components/loaders";
import CreatePost from "@/components/layout/CreatePost";

import "@/features/profile/styles/ProfilePage.css";
import { baseApi } from "../../../api";

const avatarFromSeed = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

function resolveUserId(user) {
  return user?.id ?? user?._id ?? user?.userId ?? user?.username ?? null;
}

// ফলোয়ার এবং ফলোয়িং লিস্টের জন্য ডেটা নরমাল করার ফাংশন
function normalizeUserList(users) {
  if (!Array.isArray(users)) return [];
  return users.map((u) => ({
    _id: u._id || u.id || String(Math.random()),
    name: u.name || u.fullName || u.username || "Unknown",
    username: u.username || "user",
    profileImage: u.profileImage || u.avatar || null,
  }));
}

function normalizeLikedUser(raw, fallbackSeed) {
  if (!raw) return null;
  if (typeof raw === "string" || typeof raw === "number") {
    const id = String(raw);
    return { id, username: id, name: id, avatar: avatarFromSeed(id) };
  }
  if (typeof raw === "object") {
    const id = raw._id ?? raw.id ?? raw.userId ?? raw.username ?? null;
    if (!id) return null;
    const username = raw.username ?? String(id);
    const name = raw.name ?? raw.fullName ?? raw.username ?? String(id);
    const avatarPath = raw.profileImage ?? raw.avatar ?? null;
    const avatar = avatarPath
      ? `${baseApi}${avatarPath}`
      : avatarFromSeed(username || fallbackSeed || String(id));
    return { id, username, name, avatar };
  }
  return null;
}

export default function ProfilePage() {
  const { username } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);
  const [mySeedPrices, setMySeedPrices] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState("text");
  const [allPostsOpen, setAllPostsOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [activePostMode, setActivePostMode] = useState("comments");
  const [activePostStartIndex, setActivePostStartIndex] = useState(0);

  const composerRef = useRef(null);

  const closeActivePost = useCallback(() => {
    setActivePostId(null);
    setActivePostMode("comments");
    setActivePostStartIndex(0);
  }, []);

  const openPostComments = useCallback((postId, startIndex = 0) => {
    setActivePostMode("comments");
    setActivePostStartIndex(Number.isFinite(startIndex) ? startIndex : 0);
    setActivePostId(postId);
  }, []);

  const openPostLikes = useCallback((postId) => {
    setActivePostMode("likes");
    setActivePostStartIndex(0);
    setActivePostId(postId);
  }, []);

  useEffect(() => {
    const loadCurrentUserAndProfile = async () => {
      try {
        setLoading(true);

        const meResponse = await fetchMe();
        const meData = meResponse?.data ?? meResponse;
        setCurrentUser(meData);

        let profileUserId = username ?? resolveUserId(meData);
        if (!profileUserId) throw new Error("Profile user not found");

        const postsResponse = await fetchUserPosts(profileUserId);
        const fetchedPosts = postsResponse ?? [];

        const normalizedPosts = (fetchedPosts.posts || []).map((post) => {
          const meId = resolveUserId(meData);
          const rawLikes = Array.isArray(post.likes) ? post.likes : [];
          const likedUsers = rawLikes
            .map((l) => normalizeLikedUser(l, meData?.username || meData?.name))
            .filter(Boolean);
          const liked = meId
            ? likedUsers.some(
                (u) =>
                  String(resolveUserId(u)).toLowerCase() ===
                  String(meId).toLowerCase(),
              )
            : false;

          return {
            ...post,
            id: post._id,
            author: {
              id: post.user?._id || post.userId,
              name: post.user?.username || post.user?.name || "Unknown",
              state: post.user?.state || "Unknown",
              avatar: post.user?.profileImage
                ? `${baseApi}${post.user.profileImage}`
                : avatarFromSeed(post.user?.username || "user"),
            },
            content:
              post.text ||
              post.content ||
              post.caption ||
              post.description ||
              "",
            likes: likedUsers.length,
            liked,
            likedUsers,
            comments: (post.comments || []).map((c) => ({
              id: c._id,
              text: c.text,
              author: {
                id: resolveUserId(c.user),
                name: c.user?.username || c.user?.name || "Unknown",
                state: c.user?.state || "Unknown",
                avatar: c.user?.profileImage
                  ? `${baseApi}${c.user?.profileImage}`
                  : avatarFromSeed(c.user?.username || "user"),
              },
              createdAt: c.createdAt,
            })),
            mediaGallery: [
              ...(post.videos || []).map((vid) => ({
                type: "video",
                src: `${baseApi}${vid}`,
              })),
              ...(post.images || []).map((img) => ({
                type: "image",
                src: `${baseApi}${img}`,
              })),
            ],
            videoGallery: (post.videos || []).map((vid) => ({
              type: "video",
              src: `${baseApi}${vid}`,
            })),
            media:
              [
                ...(post.videos || []).map((vid) => ({
                  type: "video",
                  src: `${baseApi}${vid}`,
                })),
                ...(post.images || []).map((img) => ({
                  type: "image",
                  src: `${baseApi}${img}`,
                })),
              ][0] ?? null,
          };
        });

        // প্রোফাইল ডেটা সেট করার সময় ফলোয়ার লিস্ট নরমালাইজ করা হচ্ছে
        setProfile(
          meData?._id === profileUserId || meData?.id === profileUserId
            ? meData
            : { ...meData, _id: profileUserId },
        );
        setPosts(normalizedPosts);

        // 🔥 এইখানে পরিবর্তন: ডেটা সেট করার আগে নরমাল করে নেওয়া হচ্ছে
        setFollowers(normalizeUserList(meData.followers));
        setFollowing(normalizeUserList(meData.following));

        if (profileUserId === resolveUserId(meData)) {
          try {
            const seedsResponse = await fetchMySeedPrices();
            const prices = seedsResponse?.data ?? seedsResponse ?? [];
            setMySeedPrices(prices);
          } catch (err) {
            console.error("Failed to fetch seed prices", err);
          }
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        toast.error("Profile load করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUserAndProfile();
  }, [username]);

  // ... বাকি হ্যান্ডলারগুলো (toggleLike, addComment, etc.) আগের মতোই থাকবে
  // (সংক্ষেপিত করার জন্য নিচে শুধু রিটার্ন অংশ দেওয়া হলো)

  return (
    <div className="profile-page">
      <ProfileOverview
        profile={profile}
        stats={stats}
        isOwner={isOwner}
        isFollowing={isFollowingProfile}
        showPrimaryAction={!isOwner}
        onPrimaryAction={() => toast.success("প্রোফাইল সম্পাদনা")}
        onOpenAllPosts={() => setAllPostsOpen(true)}
        onOpenFollowers={() => setFollowersOpen(true)}
        onOpenFollowing={() => setFollowingOpen(true)}
      />

      <div className="profile-two-column">
        <ProfileSidebar
          profile={profile}
          isOwner={isOwner}
          compactSeedDisplay={!isOwner}
          seeds={mySeedPrices}
          hasMoreSeeds={false}
          onDeleteSeed={deleteSeedHandler}
          onOpenComposer={(mode) => {
            setComposerMode(mode);
            setComposerOpen(true);
          }}
          onLoadMoreSeeds={() => {}}
        />

        <section className="post-feed">
          {isOwner && (
            <CreatePost
              user={profile.name || profile.username || "You"}
              profile={profile.profileImage}
              onTextClick={() => {
                setComposerMode("text");
                setComposerOpen(true);
              }}
              onPhotoVideoClick={() => {
                setComposerMode("media");
                setComposerOpen(true);
                setTimeout(() => {
                  composerRef.current?.triggerFileInput();
                }, 100);
              }}
            />
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isOwner={isOwner}
              onLike={toggleLike}
              onOpenComments={openPostComments}
              onOpenLikes={openPostLikes}
              onDelete={deletePostHandler}
              onAddComment={addComment}
              onOpenPost={openPostComments}
            />
          ))}
        </section>
      </div>

      <FollowListModal
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        title="অনুসরণকারী"
        users={followers}
      />

      <FollowListModal
        open={followingOpen}
        onClose={() => setFollowingOpen(false)}
        title="আপনি যাদের অনুসরণ করছেন"
        users={following}
      />

      {/* বাকি মডালগুলো... */}
    </div>
  );
}
