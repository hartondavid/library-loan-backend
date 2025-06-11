import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import createMulter from "../utils/uploadUtils.mjs";

const upload = createMulter('public/uploads/books', ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']);

const router = Router();

// Adaugă o cartea nouă (doar admin)
router.post('/addBook', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

    try {

        const { title, author, description, language, quantity } = req.body;
        const userId = req.user?.id;

        if (!title || !author || !description || !language || !quantity) {
            return sendJsonResponse(res, false, 400, "Câmpurile title, author, description, language și quantity sunt obligatorii!", []);
        }

        if (!req.files || !req.files['photo']) {
            return sendJsonResponse(res, false, 400, "Image is required", null);
        }

        let filePathForImagePath = req.files['photo'][0].path; // Get the full file path
        filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const [id] = await db('books').insert({
            title, author, description, language, photo: filePathForImagePath, librarian_id: userId, quantity
        });



        const book = await db('books').where({ id }).first();
        return sendJsonResponse(res, true, 201, "Book a fost adăugată cu succes!", { book });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea cartii!", { details: error.message });
    }
});

// Actualizează o cartea
router.put('/updateBook/:bookId', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

    try {

        const { bookId } = req.params;
        const { title, author, description, language, quantity } = req.body;

        if (!title || !author || !description || !language || !quantity) {
            return sendJsonResponse(res, false, 400, "Câmpurile title, author, description, language și quantity sunt obligatorii!", []);
        }

        const book = await db('books').where({ id: bookId }).first();

        if (!book) return sendJsonResponse(res, false, 404, "Cartea nu există!", []);

        const updateData = {
            title: title || book.title,
            author: author || book.author,
            description: description || book.description,
            language: language || book.language,
            quantity: quantity || book.quantity,
        }

        if (req.files && req.files['photo'] && req.files['photo'][0]) {
            let filePathForImagePath = req.files['photo'][0].path;
            filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');
            updateData.photo = filePathForImagePath;
        }

        const updated = await db('books').where({ id: bookId }).update(updateData);



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




        const book = await db('books').where({ id: bookId }).first();
        const loans = await db('loans').where({ book_id: bookId });

        if (!book) return sendJsonResponse(res, false, 404, "Cartea nu există!", []);
        if (loans.length > 0) return sendJsonResponse(res, false, 400, "Cartea are împrumuturi!", []);

        await db('books').where({ id: bookId }).del();

        return sendJsonResponse(res, true, 200, "Cartea a fost ștearsă cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea cartii!", { details: error.message });
    }
});

// Obține o cartea după id
router.get('/getBook/:bookId', userAuthMiddleware, async (req, res) => {
    const { bookId } = req.params;
    try {
        const book = await db('books')
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

        const books = await db('books')
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
            )

        console.log('books', books);
        if (books.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există carti!', []);
        }
        return sendJsonResponse(res, true, 200, 'Cartile au fost găsite!', books);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea cartilor!', { details: error.message });
    }
});

router.get('/getBooks', userAuthMiddleware, async (req, res) => {
    try {
        const books = await db('books')
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