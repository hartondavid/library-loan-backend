import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Function to create multer storage with a dynamic destination
const createStorage = (uploadPath) => multer.diskStorage({
    destination: function (req, file, cb) {
        // Create the folder if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Dynamic file filter function
const createFileFilter = (allowedMimeTypes) => (req, file, cb) => {
    console.log('File received in filter:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
    });
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        console.log('File type accepted:', file.mimetype);
        cb(null, true);
    } else {
        console.log('File type rejected:', file.mimetype);
        cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
};

// Function to return a multer instance with a dynamic destination and file type filter
const createMulter = (destinationPath, allowedMimeTypes) => {
    console.log('Creating multer instance with:', {
        destinationPath,
        allowedMimeTypes
    });
    
    return multer({
        storage: createStorage(destinationPath),
        fileFilter: createFileFilter(allowedMimeTypes),
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        }
    });
};

export default createMulter;
