import subprocess
import os

def fix_git_index():
    # Get list of hidden files
    try:
        output = subprocess.check_output(["git", "ls-files", "-v"], text=True)
        files_to_fix = []
        for line in output.splitlines():
            if line.startswith('h '):
                files_to_fix.append(line[2:].strip())
        
        if not files_to_fix:
            print("No files to fix.")
            return

        print(f"Found {len(files_to_fix)} files to fix.")
        
        # Process in batches
        batch_size = 50
        for i in range(0, len(files_to_fix), batch_size):
            batch = files_to_fix[i:i+batch_size]
            subprocess.run(["git", "update-index", "--no-assume-unchanged"] + batch, check=True)
            print(f"Fixed batch {i//batch_size + 1}...")
            
        print("Done.")
        
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_git_index()

