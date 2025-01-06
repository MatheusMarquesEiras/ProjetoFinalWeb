import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { IoIosSend, IoMdClose, IoMdDownload, IoMdCheckmark } from "react-icons/io";
import { FaTrashAlt } from "react-icons/fa";

const Dashboard = ({ setIsAuthenticated }) => {
    const [username, setUsername] = useState('');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [text_user, setTextUser] = useState('');
    const [history, setHistory] = useState([]);
    const [conversationTitles, setConversationTitles] = useState([])
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [haveResponse, setHaveResponse] = useState(null);
    const [modalInput, setModalInput] = useState('');
    const [modelInfo, setModelInfo] = useState([]);
    const [loadingButtons, setLoadingButtons] = useState([]);
    const [currentModel, setCurrentModel] = useState('');
    const [isUpdatingModels, setIsUpdatingModels] = useState(false);
    const [newConversation, setNewConversation] = useState(true);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                await fetchTitles();
                const response1 = await api.get('/check-session');
                setUsername(response1.data.username);
                const response2 = await api.get('/get-current-model');
                console.log("Fetched current model:", response2.data.current_model);
                setCurrentModel(response2.data.current_model);
            } catch (error) {
                setIsAuthenticated(false);
                navigate('/login');
            }
        };

        fetchUser();
    }, [navigate, setIsAuthenticated]);

    const fetchModelList = async () => {
        try {
            setIsUpdatingModels(true);
            const response = await api.get('/list-models');
            setModelInfo(response.data.local_models);
        } catch (error) {
            console.error('Erro ao buscar lista de modelos:', error);
        } finally {
            setIsUpdatingModels(false);
        }
    };

    const openConfig = async () => {
        setIsConfigOpen(true);
        await fetchModelList();
    };

    const closeConfig = () => {
        console.log("Closing config. Resetting currentModel to empty.");
        setIsConfigOpen(false);
        setHaveResponse(null);
        setModelInfo([]);
    };

    const handleTextUser = async (event) => {
        event.preventDefault();
        if (text_user.trim() === "") {
            alert("Digite algo antes de enviar!");
            return;
        }
    
        try {
            const userMessage = { type: 'user', content: text_user };
            setHistory((prevHistory) => [...prevHistory, userMessage]);
            const placeholderAIMessage = { type: 'ai', content: "..." };
            setHistory((prevHistory) => [...prevHistory, placeholderAIMessage]);
    
            if (history.length === 0) {
                setNewConversation(true);
            }
            console.log("text_user: ",text_user);
            console.log("new_conversation: ",newConversation);
            const response = await api.post('/gen', {
                "text_user": text_user,
                "new_conversation": newConversation
            });
    
            setNewConversation(false);
            console.log(response.data);
    
            if (response.status === 200) {
                await fetchTitles();

                const conversation_id = response.data["conversation_id"];
                console.log("Dados da resposta:", response.data);

                console.log(conversation_id);

                setCurrentConversationId(conversation_id);

                console.log("currentConversationId",currentConversationId);

                const eventSource = new EventSource(
                    `http://localhost:5000/gen?conversation_id=${encodeURIComponent(conversation_id)}`
                );
    
                let aiResponseText = "";
    
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.done) {
                            eventSource.close();
                        } else {
                            aiResponseText += data.message;
                            setHistory((prevHistory) => {
                                const updatedHistory = [...prevHistory];
                                updatedHistory[updatedHistory.length - 1] = { type: 'ai', content: aiResponseText };
                                return updatedHistory;
                            });
                        }
                    } catch (error) {
                        console.error("Erro ao processar chunk:", error);
                        eventSource.close();
                    }
                };
    
                eventSource.onerror = () => {
                    console.error("Erro ao receber eventos:");
                    eventSource.close();
                };
            } else {
                console.error("Erro ao iniciar o processamento.");
            }
        } catch (error) {
            alert("Erro ao enviar ou processar a resposta da IA.");
            console.error(error);
        } finally {
            setTextUser("");
        }
    };
    

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            await api.post('/logout');
            setIsAuthenticated(false);
            navigate('/login');
        } catch (error) {
            alert('Erro ao sair. Tente novamente.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const pullModel = async () => {
        try {
            const response = await api.post('/pull-model', { model_name: modalInput });
            await fetchModelList(); // Atualiza a lista após o download
            setHaveResponse(response.data.success);
        } catch (error) {
            console.error('Erro ao baixar modelo:', error);
        } finally {
            setModalInput('');
        }
    };

    const setModel = async (index, modelName) => {
        setLoadingButtons((prev) => {
            const updated = [...prev];
            updated[index] = true;
            return updated;
        });
    
        try {
            console.log("Setting model to:", modelName);
            const response = await api.post('/set-model', { model: modelName });
            console.log("API Response for set-model:", response.data);
    
            setCurrentModel(modelName);
        } catch (error) {
            console.error("Error setting model:", error);
        } finally {
            setLoadingButtons((prev) => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
            });
        }
    };
    

    const deleteModel = async (event) => {
        const value = event.currentTarget.value;

        if (!value) {
            console.error("Nenhum valor foi recebido para deletar o modelo.");
            return;
        }

        try {
            await api.post('/delete-model', { model_name: value });
            await fetchModelList(); // Atualiza a lista após a exclusão
        } catch (error) {
            console.error("Erro ao tentar deletar o modelo:", error.response?.data || error.message);
        }
    };

    const fetchTitles = async () =>{
        try{
            const response = await api.get('/get_titles');
            setConversationTitles(response.data["titles"]);
            console.log("titulos",conversationTitles);
            console.log('currentConversationId',currentConversationId)

        } catch (error){
            console.log(error);
        }
    };

    const fetchConversationHistory = async(id) => {
        try{
            const response = await api.post('/get-history',{
                "conv_id": id
            });
            console.log(response.data);
            setHistory(response.data["history"]);
            setCurrentConversationId(id);
        } catch (error){
            console.log(error);
        }
    };

    return (
        <div className="flex w-full h-screen font-sans">
            {/* Sidebar */}
            <div className="flex flex-col items-center h-full bg-cyan-500 p-4 min-w-72 max-w-72 max-h-full sm:min-w-48 xl:min-w-72">
                <button 
                onClick={() => {
                    setNewConversation(true);
                    setHistory([]);
                }}
                className="text-center p-1 rounded-full text-1xl mb-4 hover:bg-blue-300 w-8/12 px-4 py-2">
                    Nova conversa
                </button>
                <button onClick={openConfig} className="text-center p-1 rounded-full text-1xl mb-4 hover:bg-blue-300 w-8/12 px-4 py-2">
                    Configurações
                </button>
                <hr className="w-3/4 border-1 border-black" />
                <button onClick={handleLogout} disabled={isLoggingOut} className="text-center p-1 rounded-full text-1xl my-4 hover:bg-blue-300 w-8/12">
                    {isLoggingOut ? 'Saindo...' : 'Sair'}
                </button>
                <hr className="w-3/4 border-1 border-black" />
                <h2 className="text-xl my-4 underline">Histórico</h2>
                <div className="flex flex-col items-center w-full mb-2 overflow-auto max-h-full">
                    {conversationTitles.map((item, index) => (
                        <button
                        key={index}
                        onClick={() => fetchConversationHistory(item.id)}
                        className={`w-full flex items-center justify-center mb-4 p-2 rounded-xl hover:bg-green-600 ${Number(currentConversationId) === Number(item.id) ? 'bg-green-600' : 'bg-green-400'}`}
                        >
                            {item.title}
                        </button>
                    ))}
                </div>
            </div>
            {/* Main Content */}
            <div className="flex flex-col items-center justify-between flex-grow h-full bg-blue-500">
                <h1 className={`text-center text-3xl mt-8 ${history.length > 0 ? 'hidden' : ''}`}>
                    Olá <strong className="text-teal-200">{username.toUpperCase()}</strong>, o que vamos conversar hoje?
                </h1>
                <div className="w-full h-full overflow-y-auto px-52 my-4">
                    {history.map((item, index) => (
                        <div
                            key={`message-${index}`}
                            className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'} mt-4 w-full`}
                        >
                            <p
                                className={`rounded-3xl py-3 px-5 ${item.type === 'user' ? 'bg-gray-300' : 'bg-gray-400'}`}
                                style={{ maxWidth: "75%", wordWrap: "break-word" }}
                            >
                                {item.content}
                            </p>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleTextUser} className="grid grid-cols-12 mb-8 text-2xl w-8/12">
                    <div className="flex items-center col-span-11">
                        <textarea
                            className="w-full rounded-lg resize-none p-2"
                            style={{ maxHeight: "4rem" }}
                            value={text_user}
                            onChange={(e) => {
                                setTextUser(e.target.value);
                                e.target.style.height = "auto";
                                const newHeight = Math.min(e.target.scrollHeight, 64);
                                e.target.style.height = `${newHeight}px`;
                            }}
                            rows={1}
                            placeholder="Digite sua mensagem..."
                        />
                    </div>
                    <div className="col-span-1 flex items-center">
                        <button
                            type="submit"
                            className="bg-blue-400 hover:bg-blue-200 rounded-lg h-12 w-12 flex items-center justify-center ml-4 sm:min-w-12"
                        >
                            <IoIosSend />
                        </button>
                    </div>
                </form>
            </div>
            {/* Modal */}
            {isConfigOpen && (
                <div>
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeConfig}></div>
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="flex bg-white p-8 rounded-lg shadow-lg w-10/12 h-5/6">
                            <div className="flex flex-col flex-grow">
                                <h2 className="text-2xl mb-4">Configurações</h2>
                                <p>Baixar novo modelo</p>
                                <div className="flex">
                                    <div className="flex w-5/12 text-2xl py-4">
                                        <input
                                            type="text"
                                            placeholder="Modelo"
                                            className="flex flex-grow bg-gray-300 rounded-full px-4"
                                            value={modalInput}
                                            onChange={(e) => setModalInput(e.target.value)}
                                        />
                                        <button onClick={pullModel} className="bg-blue-400 text-white ml-4 p-2 rounded-full">
                                            <IoMdDownload />
                                        </button>
                                    </div>
                                    {haveResponse !== null && (
                                        <div className="text-2xl flex items-center">
                                            {haveResponse ? (
                                                <div className="flex items-center underline">
                                                    <IoMdCheckmark className="bg-green-500 text-white mx-4" />
                                                    <p>Sucesso ao baixar modelo</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center underline">
                                                    <IoMdClose className="bg-red-500 text-white mx-4" />
                                                    <p>Erro ao baixar modelo</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col flex-grow">
                                    <h2 className="text-2xl mb-4">Modelos</h2>
                                    <h3>Modelo Atual: {currentModel || "Nenhum modelo selecionado"}</h3>
                                    {isUpdatingModels ? (
                                        <p>Carregando modelos...</p>
                                    ) : (
                                        <div className="w-full h-full grid grid-cols-4 gap-4 p-4 max-h-[20rem] overflow-y-auto">
                                            {modelInfo.map((model, index) => (
                                                <div className="max-h-14 grid grid-cols-5 gap-2" key={model.name}>
                                                    <div className="col-span-4">
                                                        <button
                                                            onClick={() => { 
                                                                console.log("Trocando para o modelo:", model.name);
                                                                setModel(index, model.name); 
                                                            }}
                                                            disabled={loadingButtons[index]}
                                                            className={`grid grid-cols-4 max-h-10 text-sm ${loadingButtons[index] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <p className="bg-green-300 col-span-3 flex items-center justify-center w-full h-full rounded-tl-lg rounded-bl-lg px-4 py-2">
                                                                {model.name}
                                                            </p>
                                                            <p className="bg-green-400 col-span-1 flex items-center justify-center w-full h-full rounded-tr-lg rounded-br-lg px-4 py-2">
                                                                {model.size}
                                                            </p>
                                                        </button>
                                                    </div>
                                                    <div className="col-span-1 bg-red-600 hover:bg-red-400 flex flex-grow rounded-lg">
                                                        <button
                                                            onClick={deleteModel}
                                                            value={model.name}
                                                            className="text-3xl w-full h-full flex items-center justify-center text-center hover:text-white text-black"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-10">
                                <button onClick={closeConfig} className="mt-4 bg-blue-500 text-white p-2 rounded-full text-2xl w-full h-full">
                                    <IoMdClose />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
