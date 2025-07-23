import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Alert,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn,
} from '@mui/icons-material';
import { useActivePalenques, useCreatePalenque, useUpdatePalenque, useDeletePalenque } from '../../hooks/useFirestore';
import type { Palenque } from '../../types';

interface PalenqueFormData {
  name: string;
  description: string;
  location: string;
  active: boolean;
}

const PalenquesPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPalenque, setEditingPalenque] = useState<Palenque | null>(null);
  const [formData, setFormData] = useState<PalenqueFormData>({
    name: '',
    description: '',
    location: '',
    active: true,
  });
  const [error, setError] = useState('');

  // Queries and mutations
  const { data: palenques, isLoading, error: queryError } = useActivePalenques();
  const createPalenque = useCreatePalenque();
  const updatePalenque = useUpdatePalenque();
  const deletePalenque = useDeletePalenque();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      active: true,
    });
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingPalenque(null);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (palenque: Palenque) => {
    setFormData({
      name: palenque.name,
      description: palenque.description,
      location: palenque.location || '',
      active: palenque.active,
    });
    setEditingPalenque(palenque);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingPalenque(null);
    resetForm();
  };

  const handleInputChange = (field: keyof PalenqueFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'active' ? event.target.checked : event.target.value;
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setError('');
      
      if (editingPalenque) {
        await updatePalenque.mutateAsync({
          id: editingPalenque.id,
          updates: formData,
        });
      } else {
        await createPalenque.mutateAsync({
          ...formData,
          creationDate: new Date() as any,
        });
      }
      
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this palenque?')) {
      try {
        await deletePalenque.mutateAsync(id);
      } catch (err: any) {
        console.error('Error deleting palenque:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Palenques Management
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Card key={item} sx={{ width: 320 }}>
              <CardContent>
                <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Palenques Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Add Palenque
        </Button>
      </Box>

      {queryError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading palenques: {queryError.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {palenques?.map((palenque) => (
          <Card key={palenque.id} sx={{ width: 320 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" component="h3">
                  {palenque.name}
                </Typography>
                <Chip 
                  label={palenque.active ? 'Active' : 'Inactive'} 
                  color={palenque.active ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {palenque.description}
              </Typography>

              {palenque.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{palenque.location}</Typography>
                </Box>
              )}

              <Typography variant="caption" color="text.secondary">
                Created: {new Date(palenque.creationDate.seconds * 1000).toLocaleDateString()}
              </Typography>
            </CardContent>
            
            <CardActions>
              <IconButton
                size="small"
                onClick={() => handleOpenEdit(palenque)}
                color="primary"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDelete(palenque.id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>

      {palenques?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No palenques found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first palenque to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Add First Palenque
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPalenque ? 'Edit Palenque' : 'Create New Palenque'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange('name')}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleInputChange('description')}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Location"
            fullWidth
            variant="outlined"
            value={formData.location}
            onChange={handleInputChange('location')}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={handleInputChange('active')}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={createPalenque.isPending || updatePalenque.isPending}
          >
            {editingPalenque ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PalenquesPage;
