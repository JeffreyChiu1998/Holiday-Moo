const BucketListButton = ({ bucketListCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bucket-list-icon"
      title="View Bucket List"
    >
      <img
        src="/img/bucket.png"
        alt="Bucket List"
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "flex";
        }}
      />
      <div className="bucket-icon-fallback" style={{ display: "none" }}>
        🪣
      </div>
      {bucketListCount > 0 && (
        <div className="bucket-unread-badge">{bucketListCount}</div>
      )}
    </button>
  );
};

export default BucketListButton;
