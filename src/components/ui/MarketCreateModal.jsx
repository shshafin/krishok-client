import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import addImage from "@/assets/icons/add.png";
import { baseApi } from "../../api";

export default function MarketCreateModal({
  open = false,
  onClose,
  user,
  title,
  onSubmitApi,
}) {
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false); // সাবমিট করার সময় ডাবল ক্লিক আটকানোর জন্য

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setDescription("");
      setImage(null);
      setLoading(false);
    }
  }, [open]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setImage(file || null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim() && !image) {
      toast.error("বর্ণনা বা ছবি অন্তত একটি দিন।");
      return;
    }

    setLoading(true); // লোডিং শুরু
    try {
      const formData = new FormData();
      formData.append("description", description);
      formData.append("userId", user?._id);
      if (image) formData.append("image", image);

      // API কল
      const res = await onSubmitApi(formData);

      if (res?.success) {
        toast.success("সফলভাবে যোগ করা হয়েছে!");

        // 🔥 এই লাইনটাই মোডাল অটোমেটিক বন্ধ করে দিবে
        onClose?.();
      } else {
        toast.error(res?.message || "কিছু ভুল হয়েছে।");
      }
    } catch (err) {
      console.error(err);
      toast.error("সার্ভার এরর হয়েছে।");
    } finally {
      setLoading(false); // লোডিং শেষ
    }
  };

  return (
    <div
      className={`modal fade ${open ? "show" : ""}`}
      id="marketCreateModal"
      style={{ display: open ? "block" : "none" }}
      tabIndex="-1"
      role="dialog"
      onClick={(e) =>
        e.target.id === "marketCreateModal" && !loading && onClose?.()
      }>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title fs-3 m-auto">{title}</h1>
            <button
              type="button"
              className="btn-close mainbtnclose"
              aria-label="Close"
              onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="user-id">
              <a href={`?krishokarea_user=${user?._id || "anonymous"}`}>
                <img
                  className="user-img-activestatus"
                  src={`${baseApi}${user?.profileImage}`}
                  alt="user profile image"
                />
                <h5>{user?.name || "User"}</h5>
              </a>
            </div>

            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data">
              <textarea
                className="box-aria"
                placeholder="এখানে বাজার মূল্যের বর্ণনা লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}></textarea>

              {preview && (
                <img
                  src={preview}
                  alt="selected image"
                  style={{
                    borderRadius: "6px",
                    width: "50%",
                    marginTop: "5px",
                  }}
                />
              )}

              <div className="user-image-box">
                <div className="icon-text">
                  <img
                    className="add-img"
                    src={addImage}
                    alt="add image icon"
                  />
                </div>
                <input
                  className="add-image-box multiple"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <input
                type="submit"
                className="add-post-dtn"
                disabled={loading} // লোডিং অবস্থায় বাটন ডিজেবল থাকবে
                value={loading ? "অপেক্ষা করুন..." : "যোগ করুন"}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
