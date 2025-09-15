import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Users, Calendar, CheckCircle } from 'lucide-react';
import { searchTansuProjects, resolveSorobanDomain, type TansuProject } from '@/lib/tansu-contracts';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';

interface ProjectSearchProps {
  onProjectSelect: (project: TansuProject, walletAddress: string) => void;
  selectedProject?: TansuProject | null;
}

export const ProjectSearch = ({ onProjectSelect, selectedProject }: ProjectSearchProps) => {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<TansuProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState<string | null>(null);
  const { network } = useNetwork();
  const { toast } = useToast();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setProjects([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchTansuProjects(query, network);
        setProjects(results);
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          variant: 'destructive',
          title: 'Search Failed',
          description: 'Could not search for projects. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, network, toast]);

  const handleProjectSelect = async (project: TansuProject) => {
    setResolvingAddress(project.id);
    
    try {
      // Resolve the domain to get the wallet address
      const walletAddress = await resolveSorobanDomain(project.domain, network);
      
      if (!walletAddress) {
        toast({
          variant: 'destructive',
          title: 'Domain Resolution Failed',
          description: `Could not resolve ${project.domain} to a wallet address.`,
        });
        return;
      }

      onProjectSelect(project, walletAddress);
      
      // Persist selection so other pages (e.g., Vault) can read it
      try {
        localStorage.setItem('selectedProject', JSON.stringify(project));
        localStorage.setItem('selectedProjectWalletAddress', walletAddress);
      } catch {}
      
      toast({
        title: 'Project Selected',
        description: `Connected to ${project.name} project vault.`,
      });
    } catch (error) {
      console.error('Failed to resolve project address:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed', 
        description: 'Could not connect to project vault.',
      });
    } finally {
      setResolvingAddress(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Tansu Projects
        </CardTitle>
        <CardDescription>
          Find and connect to a Tansu project to manage its treasury vault
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by project name, domain, or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Project Display */}
        {selectedProject && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="font-medium text-success">Connected Project</span>
              </div>
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold">{selectedProject.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    {selectedProject.domain}
                  </Badge>
                  <Badge variant={selectedProject.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {selectedProject.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Searching projects...</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && projects.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className={`border-border/50 cursor-pointer transition-all hover:shadow-md ${
                  selectedProject?.id === project.id ? 'ring-2 ring-success' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold truncate">{project.name}</h4>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {project.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span className="font-mono">{project.domain}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{project.maintainers.length} maintainer{project.maintainers.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleProjectSelect(project)}
                      disabled={resolvingAddress === project.id || selectedProject?.id === project.id}
                      className="shrink-0"
                    >
                      {resolvingAddress === project.id ? 'Connecting...' : 
                       selectedProject?.id === project.id ? 'Connected' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && query && projects.length === 0 && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No projects found for "{query}"</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching by project name, domain, or description
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !query && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Start typing to search for Tansu projects</p>
            <p className="text-xs text-muted-foreground mt-1">
              You can search by project name, domain, or description
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};