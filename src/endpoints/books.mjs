import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import createMulter, { smartUpload } from "../utils/uploadUtils.mjs";

const upload = createMulter('public/uploads/books', ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']);

const router = Router();

// Adaugă o cartea nouă 
router.post('/addBook', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

    try {
        const { title, author, description, language, quantity, publisher, number_of_pages } = req.body;
        const userId = req.user?.id;

        if (!title || !author || !description || !language || !quantity || !publisher || !number_of_pages) {
            return sendJsonResponse(res, false, 400, "Câmpurile title, author, description, language, quantity, publisher și number_of_pages sunt obligatorii!", []);
        }

        if (!req.files || !req.files['photo']) {
            return sendJsonResponse(res, false, 400, "Image is required", null);
        }

        // Use smartUpload to handle both local and serverless environments
        let filePathForImagePath;
        try {
            filePathForImagePath = await smartUpload(req.files['photo'][0], 'books');
            console.log('📁 File uploaded successfully:', filePathForImagePath);
        } catch (uploadError) {
            console.error('❌ File upload failed:', uploadError);
            return sendJsonResponse(res, false, 500, "File upload failed", { details: uploadError.message });
        }


        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const result = await (await db.getKnex())('books').insert({
            title, author, description, language, photo: filePathForImagePath, librarian_id: userId, quantity, publisher, number_of_pages
        }).returning('*');

        const book = result[0];
        return sendJsonResponse(res, true, 201, "Book a fost adăugată cu succes!", { book });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea cartii!", { details: error.message });
    }
});

// Actualizează o cartea
router.put('/updateBook/:bookId', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

    try {

        const { bookId } = req.params;
        const { title, author, description, language, quantity, publisher, number_of_pages } = req.body;

        if (!title || !author || !description || !language || !quantity || !publisher || !number_of_pages) {
            return sendJsonResponse(res, false, 400, "Câmpurile title, author, description, language, quantity, publisher și number_of_pages sunt obligatorii!", []);
        }

        const book = await (await db.getKnex())('books').where({ id: bookId }).first();

        if (!book) return sendJsonResponse(res, false, 404, "Cartea nu există!", []);

        const updateData = {
            title: title || book.title,
            author: author || book.author,
            description: description || book.description,
            language: language || book.language,
            quantity: quantity || book.quantity,
            publisher: publisher || book.publisher,
            number_of_pages: number_of_pages || book.number_of_pages,
        }


        if (req.files && req.files['photo'] && req.files['photo'][0]) {
            // Use smart upload function that automatically chooses storage method
            const photoUrl = await smartUpload(req.files['photo'][0], 'books');
            console.log('🔍 updateBook - Photo URL determined:', photoUrl);
            updateData.photo = photoUrl;
        }

        const updated = await (await db.getKnex())('books').where({ id: bookId }).update(updateData);

        if (!updated) return sendJsonResponse(res, false, 404, "Cartea nu a fost actualizată!", []);

        return sendJsonResponse(res, true, 200, "Cartea a fost actualizată cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la actualizarea cartii!", { details: error.message });
    }
});

// Șterge o cartea
router.delete('/deleteBook/:bookId', userAuthMiddleware, async (req, res) => {

    try {

        const { bookId } = req.params;

        const book = await (await db.getKnex())('books').where({ id: bookId }).first();
        const loans = await (await db.getKnex())('loans').where({ book_id: bookId });

        if (!book) return sendJsonResponse(res, false, 404, "Cartea nu există!", []);
        if (loans.length > 0) return sendJsonResponse(res, false, 400, "Cartea are împrumuturi!", []);

        // Delete the image from Vercel Blob if it's a Blob URL
        if (book.photo) {
            console.log('🔍 deleteBook - Deleting image:', book.photo);
            await deleteFromBlob(book.photo);
        }

        await (await db.getKnex())('books').where({ id: bookId }).del();

        return sendJsonResponse(res, true, 200, "Cartea a fost ștearsă cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea cartii!", { details: error.message });
    }
});

// Obține o cartea după id
router.get('/getBook/:bookId', userAuthMiddleware, async (req, res) => {
    const { bookId } = req.params;
    try {
        const book = await (await db.getKnex())('books')
            .where('books.id', bookId)
            .select(
                'books.id',
                'books.title',
                'books.author',
                'books.description',
                'books.language',
                'books.photo',
                'books.status',
                'books.quantity',
                'books.librarian_id',
                'books.created_at',
                'books.updated_at',
                'books.publisher',
                'books.number_of_pages',
            )
            .first();
        if (!book) {
            return sendJsonResponse(res, false, 404, 'Cartea nu există!', []);
        }
        return sendJsonResponse(res, true, 200, 'Cartea a fost găsită!', book);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea cartii!', { details: error.message });
    }
});


router.get('/getBooks', userAuthMiddleware, async (req, res) => {
    try {
        const books = await (await db.getKnex())('books')
            .join('users', 'books.librarian_id', 'users.id')
            .join('user_rights', 'users.id', 'user_rights.user_id')
            .where('user_rights.right_id', 2)
            .where('users.id', req.user.id)
            .select(
                'books.id',
                'books.title',
                'books.author',
                'books.description',
                'books.language',
                'books.photo',
                'books.status',
                'books.quantity',
                'books.created_at',
                'books.publisher',
                'books.number_of_pages',
            )
        if (books.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există carti!', []);
        }
        return sendJsonResponse(res, true, 200, 'Cartile au fost găsite!', books);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea cartilor!', { details: error.message });
    }
});

export default router; 