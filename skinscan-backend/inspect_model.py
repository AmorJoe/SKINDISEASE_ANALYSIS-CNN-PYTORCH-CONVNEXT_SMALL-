
import torch
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

model_path = os.path.join('ml_models', 'fold1_best (6).pth')

if not os.path.exists(model_path):
    print(f"Error: Model not found at {model_path}")
    sys.exit(1)

try:
    print(f"Loading model from {model_path}...")
    checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
    
    if isinstance(checkpoint, dict):
        print("Checkpoint is a dictionary.")
        if 'state_dict' in checkpoint:
            print("Found 'state_dict' key.")
            state_dict = checkpoint['state_dict']
        else:
            print("No 'state_dict' key, assuming dictionary IS the state dict.")
            state_dict = checkpoint
            
        # Inspect classifier weights to determine number of classes
        # EfficientNet usually has 'classifier.1.weight' or similar
        classifier_weight_keys = [k for k in state_dict.keys() if 'classifier' in k and 'weight' in k]
        print(f"Classifier keys found: {classifier_weight_keys}")
        
        for key in classifier_weight_keys:
            weights = state_dict[key]
            print(f"Shape of {key}: {weights.shape}")
            # Usually [num_classes, num_features]
            print(f"Inferred number of classes: {weights.shape[0]}")
            
    else:
        print("Checkpoint is a full model object (not just weights).")
        # Try to inspect the classifier directly if possible
        try:
             # Assuming EfficientNet or similar structure where classifier is the last layer
            if hasattr(checkpoint, 'classifier'):
                print("Model has 'classifier' attribute.")
                print(checkpoint.classifier)
            elif hasattr(checkpoint, 'fc'): # ResNet
                print("Model has 'fc' attribute.")
                print(checkpoint.fc)
        except Exception as e:
            print(f"Could not inspect model structure: {e}")

except Exception as e:
    print(f"Failed to load model: {e}")
