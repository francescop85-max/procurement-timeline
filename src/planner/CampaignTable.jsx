export default function CampaignTable({ onAdd }) {
  return (
    <div className="planner-table-section">
      <div className="planner-table-header">
        <span className="planner-table-title">Campaigns</span>
        <button className="action-btn details" onClick={onAdd}>+ Add Campaign</button>
      </div>
      <p style={{color:'#888',fontSize:12}}>Table (coming soon)</p>
    </div>
  );
}
