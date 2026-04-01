

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchFocus: () => void;
  onAddClick: () => void;
  showSearch?: boolean;
}

export default function Topbar({ searchQuery, setSearchQuery, onSearchFocus, onAddClick, showSearch }: TopbarProps) {
  return (
    <header className="topbar">
      {showSearch !== false ? (
        <div className="search-box">
          <span>🔍</span>
          <input 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearchFocus();
            }}
            type="text" 
            placeholder="全局搜索宠物或主人姓名..." 
          />
        </div>
      ) : <div style={{flex: 1}}></div>}
      <div className="header-actions">
        <button className="btn-icon">💡</button>
        <button className="btn-icon">🔔</button>
        <button className="btn-primary" onClick={onAddClick}>➕ 快速建档</button>
      </div>
    </header>
  );
}
