import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";

interface UserFiltersProps {
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
}: UserFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedVerified, setSelectedVerified] = useState<string | null>(null);

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedTier(null);
    setSelectedVerified(null);
    onReset();
  };

  const handleTierChange = (value: string) => {
    const tier = value === "all" ? null : value;
    setSelectedTier(tier);
    onFilterTier(tier);
  };

  const handleVerifiedChange = (value: string) => {
    if (value === "all") {
      setSelectedVerified(null);
      onFilterVerified(null);
    } else {
      const isVerified = value === "verified";
      setSelectedVerified(value);
      onFilterVerified(isVerified);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filter Users</CardTitle>
        <CardDescription>
          Search and filter users by name, email, tier, or verification status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedTier || "all"}
              onValueChange={handleTierChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="instant">Instant</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedVerified || "all"}
              onValueChange={handleVerifiedChange}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Verification status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSearch} className="h-9">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}