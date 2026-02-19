# File Versioning Test Guide

## 🧪 How to Test File Versioning

### **Step 1: Upload Initial File**
1. Go to Dashboard
2. Upload a file (e.g., `test-document.pdf`)
3. File should appear normally without version badge

### **Step 2: Upload Same Filename**
1. Upload another file with the **exact same filename** (`test-document.pdf`)
2. System should detect existing file and create Version 2
3. File should now show version badge "v2"
4. Success message should say "New version (v2) created successfully"

### **Step 3: View Version History**
1. Click the clock icon (🕐) on the file
2. Version History modal should open showing:
   - Timeline with v1 and v2
   - Storage class for each version
   - Upload dates and comments
   - Cost breakdown

### **Step 4: Test Version Actions**
1. **Restore Version**: Click restore on v1 to make it current
2. **Download Version**: Download specific versions
3. **Delete Version**: Delete old versions (cannot delete current)
4. **Edit Comments**: Add comments to versions

### **Step 5: Test Version Optimization**
1. Click "Optimize Storage" in version history
2. Old versions should move to cheaper storage classes
3. Cost should be reduced

## 🔧 **Backend API Testing**

### Test Version Creation
```bash
# Upload file with same name twice
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "versionComment=Updated version"
```

### Test Version History
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/versions/FILE_ID/versions
```

### Test Version Restore
```bash
curl -X PUT http://localhost:5000/api/versions/FILE_ID/versions/VERSION_ID/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 **Troubleshooting**

### **Issue: Files appear as separate instead of versions**
**Cause**: Upload route not detecting same filename
**Solution**: Check that `originalName` and `parentFolderId` match exactly

### **Issue: Version history not loading**
**Cause**: API endpoint not found or authentication issue
**Solution**: Check server logs and ensure version routes are registered

### **Issue: Version badge not showing**
**Cause**: File object missing version properties
**Solution**: Check that `totalVersions` and `currentVersion` are set

## 📊 **Expected Behavior**

### **File Object Structure (with versions):**
```javascript
{
  id: "file-uuid",
  originalName: "document.pdf",
  currentVersion: 2,
  totalVersions: 2,
  versioningEnabled: true,
  versions: [
    {
      versionId: "v1-uuid",
      versionNumber: 1,
      isActive: false,
      comment: "Initial version"
    },
    {
      versionId: "v2-uuid", 
      versionNumber: 2,
      isActive: true,
      comment: "Updated version"
    }
  ]
}
```

### **UI Indicators:**
- ✅ Version badge shows "v2" next to filename
- ✅ Clock icon appears in file actions
- ✅ Version history modal shows timeline
- ✅ Cost breakdown shows storage optimization opportunities

### **API Responses:**
- ✅ Upload response includes `isNewVersion: true`
- ✅ Version history includes cost analysis
- ✅ Restore operation updates current version

## 🚀 **Advanced Testing**

### **Test Multiple Versions**
1. Upload same file 5 times
2. Should create versions v1 through v5
3. Version history should show all versions chronologically

### **Test Storage Optimization**
1. Create multiple versions
2. Wait or manually set old dates
3. Run optimization to move old versions to cheaper storage

### **Test Version Limits**
1. Test with different user tiers (Free: 3, Pro: 10, Business: unlimited)
2. Verify retention policies work correctly

---

**Result**: A fully functional file versioning system that automatically detects same-filename uploads and creates versions instead of duplicate files.