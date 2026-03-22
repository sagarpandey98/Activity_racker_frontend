'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Plus, Trash2, Folder, Loader2 } from 'lucide-react';
import { categoriesApi } from '@/lib/api/categoriesApi';
import useAuthStore from '@/lib/store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  // Categories state
  const [categories, setCategories] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Inline form states
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [expandedDomains, setExpandedDomains] = useState({});
  const [addingSubdomain, setAddingSubdomain] = useState(null);
  const [newSubdomainName, setNewSubdomainName] = useState('');
  const [addingSpecific, setAddingSpecific] = useState(null);
  const [newSpecificName, setNewSpecificName] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.get();
        const data = res?.data || res;
        // Ensure domains array exists
        setCategories({
          uuid: data?.uuid || '',
          name: data?.name || 'User Categories',
          domains: data?.domains || []
        });
        // Auto-expand all domains
        if (data?.domains && data.domains.length > 0) {
          const expanded = {};
          data.domains.forEach(d => {
            expanded[d.uuid] = true;
          });
          setExpandedDomains(expanded);
        }
      } catch (e) {
        console.error('Failed to load categories:', e);
        setError('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Save categories to backend
  const saveCategories = async (updatedCategories) => {
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        userName: 'User',
        uuid: updatedCategories.uuid || categories?.uuid || '',
        domains: updatedCategories.domains || []
      };
      const res = await categoriesApi.update(payload);
      const data = res?.data || res;
      setCategories(data);

      // Re-expand all domains after save
      if (data?.domains && data.domains.length > 0) {
        const expanded = {};
        data.domains.forEach(d => {
          expanded[d.uuid] = true;
        });
        setExpandedDomains(expanded);
      }
    } catch (e) {
      const message =
        e.response?.data?.message ||
        e.message ||
        'Failed to save categories';
      console.error('Failed to save categories:', e);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add domain handler
  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;

    const updated = {
      ...categories,
      domains: [
        ...(categories?.domains || []),
        {
          name: newDomainName.trim(),
          uuid: '',
          description: '',
          subDomains: []
        }
      ]
    };

    setAddingDomain(false);
    setNewDomainName('');
    await saveCategories(updated);
  };

  // Add subdomain handler
  const handleAddSubdomain = async (domainUuid) => {
    if (!newSubdomainName.trim()) return;

    const updatedCategories = {
      ...categories,
      domains: categories.domains.map(d => {
        if (d.uuid === domainUuid) {
          return {
            ...d,
            subDomains: [
              ...(d.subDomains || []),
              { name: newSubdomainName, uuid: '', specifics: [] }
            ]
          };
        }
        return d;
      })
    };

    setAddingSubdomain(null);
    setNewSubdomainName('');
    await saveCategories(updatedCategories);
  };

  // Add specific handler
  const handleAddSpecific = async (domainUuid, subdomainUuid) => {
    if (!newSpecificName.trim()) return;

    const updatedCategories = {
      ...categories,
      domains: categories.domains.map(d => {
        if (d.uuid === domainUuid) {
          return {
            ...d,
            subDomains: d.subDomains.map(sd => {
              if (sd.uuid === subdomainUuid) {
                return {
                  ...sd,
                  specifics: [
                    ...(sd.specifics || []),
                    { name: newSpecificName, uuid: '' }
                  ]
                };
              }
              return sd;
            })
          };
        }
        return d;
      })
    };

    setAddingSpecific(null);
    setNewSpecificName('');
    await saveCategories(updatedCategories);
  };

  // Delete domain handler
  const handleDeleteDomain = async (domainUuid) => {
    const updatedCategories = {
      ...categories,
      domains: categories.domains.filter(d => d.uuid !== domainUuid)
    };
    await saveCategories(updatedCategories);
  };

  // Delete subdomain handler
  const handleDeleteSubdomain = async (domainUuid, subdomainUuid) => {
    const updatedCategories = {
      ...categories,
      domains: categories.domains.map(d => {
        if (d.uuid === domainUuid) {
          return {
            ...d,
            subDomains: d.subDomains.filter(sd => sd.uuid !== subdomainUuid)
          };
        }
        return d;
      })
    };
    await saveCategories(updatedCategories);
  };

  // Delete specific handler
  const handleDeleteSpecific = async (domainUuid, subdomainUuid, specificUuid) => {
    const updatedCategories = {
      ...categories,
      domains: categories.domains.map(d => {
        if (d.uuid === domainUuid) {
          return {
            ...d,
            subDomains: d.subDomains.map(sd => {
              if (sd.uuid === subdomainUuid) {
                return {
                  ...sd,
                  specifics: sd.specifics.filter(s => s.uuid !== specificUuid)
                };
              }
              return sd;
            })
          };
        }
        return d;
      })
    };
    await saveCategories(updatedCategories);
  };

  // Toggle domain expansion
  const toggleDomain = (domainUuid) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainUuid]: !prev[domainUuid]
    }));
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your preferences and categories
        </p>
      </div>

      {/* PROFILE SECTION */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Profile</h2>
          <p className="text-xs text-slate-500">
            Read only — manage via account settings
          </p>
        </div>

        <div className="space-y-3 mt-4">
          {/* Name */}
          <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
            <span className="text-xs text-slate-500">Name</span>
            <span className="text-sm text-white">{user?.name || '–'}</span>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">Email</span>
            <span className="text-sm text-white">{user?.email || '–'}</span>
          </div>
        </div>
      </div>

      {/* CATEGORY MANAGER SECTION */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Categories</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize your activities by domain
            </p>
          </div>
          <button
            onClick={() => setAddingDomain(true)}
            className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </button>
        </div>

        {/* Saving state */}
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-xs text-red-400 mb-3">{error}</div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            <div className="h-8 bg-white/5 rounded animate-pulse" />
            <div className="h-8 bg-white/5 rounded animate-pulse" />
            <div className="h-8 bg-white/5 rounded animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!categories?.domains || categories.domains.length === 0) && (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-slate-700 mx-auto" />
            <p className="text-white mt-3 font-medium">No categories yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Add your first domain to organize activities
            </p>
            <button
              onClick={() => setAddingDomain(true)}
              className="mt-4 text-white bg-slate-700 hover:bg-slate-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add Domain
            </button>
          </div>
        )}

        {/* Category tree */}
        {!isLoading && categories?.domains && categories.domains.length > 0 && (
          <div>
            {categories.domains.map((domain, domainIdx) => (
              <div key={domain.uuid || domainIdx}>
                {/* Domain row */}
                <div className="flex items-center gap-2 py-2.5 border-b border-white/[0.05] group">
                  <button
                    onClick={() => toggleDomain(domain.uuid)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        expandedDomains[domain.uuid] ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  <span className="text-sm font-medium text-white flex-1">
                    {domain.name}
                  </span>

                  {/* Action buttons (show on hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setAddingSubdomain(domain.uuid)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Add subdomain"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDomain(domain.uuid)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete domain"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Add subdomain form */}
                {addingSubdomain === domain.uuid && (
                  <div className="pl-6 mt-2 flex gap-2 items-center">
                    <input
                      autoFocus
                      value={newSubdomainName}
                      onChange={e => setNewSubdomainName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddSubdomain(domain.uuid);
                      }}
                      placeholder="Subdomain name"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
                    />
                    <button
                      onClick={() => handleAddSubdomain(domain.uuid)}
                      className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingSubdomain(null);
                        setNewSubdomainName('');
                      }}
                      className="text-slate-500 hover:text-white text-xs px-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Subdomains */}
                {expandedDomains[domain.uuid] && domain.subDomains && (
                  <div className="pl-6">
                    {domain.subDomains.map((subdomain, subdomainIdx) => (
                      <div key={subdomain.uuid || subdomainIdx}>
                        {/* Subdomain row */}
                        <div className="flex items-center gap-2 py-2 border-b border-white/[0.04] group">
                          <div className="w-1 h-1 rounded-full bg-slate-600" />

                          <span className="text-sm text-slate-300 flex-1">
                            {subdomain.name}
                          </span>

                          {/* Action buttons */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setAddingSpecific(subdomain.uuid)}
                              className="text-slate-500 hover:text-white transition-colors"
                              title="Add specific"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteSubdomain(domain.uuid, subdomain.uuid)
                              }
                              className="text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete subdomain"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Add specific form */}
                        {addingSpecific === subdomain.uuid && (
                          <div className="pl-10 mt-2 flex gap-2 items-center">
                            <input
                              autoFocus
                              value={newSpecificName}
                              onChange={e => setNewSpecificName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter')
                                  handleAddSpecific(domain.uuid, subdomain.uuid);
                              }}
                              placeholder="Specific name"
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
                            />
                            <button
                              onClick={() =>
                                handleAddSpecific(domain.uuid, subdomain.uuid)
                              }
                              className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddingSpecific(null);
                                setNewSpecificName('');
                              }}
                              className="text-slate-500 hover:text-white text-xs px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Specifics */}
                        {subdomain.specifics && (
                          <div className="pl-4">
                            {subdomain.specifics.map((specific, specificIdx) => (
                              <div
                                key={specific.uuid || specificIdx}
                                className="flex items-center gap-2 py-1.5 group"
                              >
                                <div className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-xs text-slate-400 flex-1">
                                  {specific.name}
                                </span>
                                <button
                                  onClick={() =>
                                    handleDeleteSpecific(
                                      domain.uuid,
                                      subdomain.uuid,
                                      specific.uuid
                                    )
                                  }
                                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Delete specific"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add domain form */}
            {addingDomain && (
              <div className="mt-3 flex gap-2 items-center">
                <input
                  autoFocus
                  value={newDomainName}
                  onChange={e => setNewDomainName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddDomain();
                    if (e.key === 'Escape') {
                      setAddingDomain(false);
                      setNewDomainName('');
                    }
                  }}
                  placeholder="e.g. Health, Work, Learning"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25"
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="bg-white text-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingDomain(false);
                    setNewDomainName('');
                  }}
                  className="text-slate-500 hover:text-white text-xs px-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

