import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, RefreshCw } from "lucide-react";

interface UserManagementFiltersProps {
  onSearch: (query: string) => void;
  onFilterTier: (tier: string | null) => void;
  onFilterVerified: (verified: boolean | null) => void;
  onReset: () => void;
}

export function UserManagementFilters({
  onSearch,
  onFilterTier,
  onFilterVerified,
  onReset,
}: UserManagementFiltersProps) {
  const [searchValue, setSearchValue] = useState("");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [verifiedFilter, setVerifiedFilter] = useState<string | null>(null);

  const handleSearch = () => {
    onSearch(searchValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    // Execute search when typing
    onSearch(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleTierChange = (value: string) => {
    const tierValue = value === "all" ? null : value;
    setTierFilter(tierValue);
    onFilterTier(tierValue);
  };

  const handleVerifiedChange = (value: string) => {
    let verifiedValue: boolean | null = null;
    
    if (value === "verified") {
      verifiedValue = true;
    } else if (value === "not-verified") {
      verifiedValue = false;
    }
    
    setVerifiedFilter(value);
    onFilterVerified(verifiedValue);
  };

  const handleReset = () => {
    setSearchValue("");
    setTierFilter(null);
    setVerifiedFilter(null);
    onReset();
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search input */}
        <div className="relative">
          <Input
            placeholder="Search users..."
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Tier filter */}
        <Select
          value={tierFilter || "all"}
          onValueChange={handleTierChange}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by tier" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>

        {/* Verified filter */}
        <Select
          value={verifiedFilter || "all"}
          onValueChange={handleVerifiedChange}
        >
          <SelectTrigger>
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by verification" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="not-verified">Not Verified</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset button */}
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
}