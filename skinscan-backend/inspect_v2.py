
import torch
import os
import sys

# Flush stdout to ensure we see prints immediately
sys.stdout.reconfigure(line_buffering=True)

model_path = os.path.join('ml_models', 'fold1_best (6).pth')
print(f"Checking path: {os.path.abspath(model_path)}")

if not os.path.exists(model_path):
    print(f"Error: Model not found at {model_path}")
    sys.exit(1)

file_size = os.path.getsize(model_path)
print(f"File size: {file_size} bytes")

try:
    print(f"Attempting to load model...")
    # Safe load using torch.load
    checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
    print("Model loaded successfully!")
    
    if isinstance(checkpoint, dict):
        print(f"Checkpoint type: dict with keys: {list(checkpoint.keys())}")
        if 'state_dict' in checkpoint:
            state_dict = checkpoint['state_dict']
            print("Found 'state_dict'.")
        else:
            state_dict = checkpoint
            print("Using dict as state_dict.")
            
        # Look for classifier weights
        classifier_keys = [k for k in state_dict.keys() if 'classifier' in k or 'fc' in k or 'head' in k]
        print(f"Potential classifier keys: {classifier_keys[:5]} ... (total {len(classifier_keys)})")
        
        # Try to find the final layer weight to count classes
        final_layer = None
        for key in reversed(list(state_dict.keys())):
            if 'weight' in key and ('classifier' in key or 'fc' in key or 'head' in key):
                final_layer = key
                break
        
        if final_layer:
            weights = state_dict[final_layer]
            print(f"Final layer identified as: {final_layer}")
            print(f"Shape: {weights.shape}")
            print(f"Inferred classes: {weights.shape[0]}")
        else:
            print("Could not identify final layer.")
            
    else:
        print(f"Checkpoint type: {type(checkpoint)}")
        print(checkpoint)

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
