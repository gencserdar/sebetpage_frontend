import type { GlobePost } from "./mockGlobePosts";

export default function GlobePostBubble({ post }: { post: GlobePost }) {
  return (
    <article
      className="landing-share__post-bubble"
      aria-label={`Post from ${post.username} in ${post.place}`}
    >
      <header className="landing-share__post-bubble-head">
        <img
          className="landing-share__post-bubble-avatar"
          src={post.avatar}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="landing-share__post-bubble-meta">
          <p className="landing-share__post-bubble-user">{post.username}</p>
          <p className="landing-share__post-bubble-place">
            {post.place}, {post.country}
          </p>
        </div>
      </header>
      <p className="landing-share__post-bubble-text">{post.text}</p>
      {post.image ? (
        <img
          className="landing-share__post-bubble-image"
          src={post.image}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </article>
  );
}
