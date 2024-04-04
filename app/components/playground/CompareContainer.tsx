import { TextColumns, Warning } from '@phosphor-icons/react';
import Button from '../Button';
import { Option } from '../inputs/Select';
import Select from '../inputs/Select';
import { useEffect, useState } from 'react';
import usePlaygroundStore from '@/app/hooks/usePlaygroundStore';
import { CompareState, PlaygroundFile } from '@/app/types/PlaygroundTypes';
import PulsingIcon from '../PulsingIcon';
import JSZip from 'jszip';
import ComingSoonBanner from './ComingSoonBanner';
import { uploadFile } from '@/app/actions/uploadFile';
import { getFileName } from '@/app/actions/downloadFile';
import toast from 'react-hot-toast';
import { runJob } from '@/app/actions/runJob';
import { AxiosError, AxiosResponse } from 'axios';

const FUNCTIONAL = false;
const columnStyles = 'w-full flex flex-col items-center justify-center gap-4';

const CompareContainer = () => {
  const { token, clientId, files, selectedFileIndex, updateFileAtIndex } = usePlaygroundStore();
  const [paperOptions, setPaperOptions] = useState<Option[]>([]);

  const [selectedFile, setSelectedFile] = useState<PlaygroundFile>();
  const [filename, setFilename] = useState<string>('');

  useEffect(() => {
    if (selectedFileIndex !== null && files.length > 0) {
      const thisFile = files[selectedFileIndex];
      setSelectedFile(thisFile);
      if (thisFile.file instanceof File) {
        setFilename(thisFile.file.name);
      } else {
        setFilename(thisFile.file);
      }
    }
  }, [selectedFileIndex, files]);

  const checkIfPDF = (file: File | string) => {
    return file instanceof File && file.name.toLowerCase().endsWith('.pdf');
  };

  useEffect(() => {
    const paperOptions = files
      .map((file, i) => {
        if (file.file instanceof File && checkIfPDF(file.file) && i !== selectedFileIndex) {
          return { label: file.file.name, value: i.toString() } as Option;
        }
        return undefined;
      })
      .filter((option) => option !== undefined) as Option[];
    setPaperOptions(paperOptions);
  }, [files, selectedFileIndex]);

  const handlePaper2Change = (paper: Option) => {
    const compareFile = files[parseInt(paper.value)].file;
    updateFileAtIndex(selectedFileIndex, 'compareFile', compareFile);
  };

  const zipFiles = async () => {
    if (!selectedFile || !selectedFile.compareFile || selectedFile?.file instanceof File === false) {
      return;
    }
    const zip = new JSZip();

    zip.file(selectedFile?.file.name, selectedFile?.file);
    zip.file(selectedFile?.compareFile?.name, selectedFile?.compareFile);

    const filename1 = getFileName(selectedFile?.file.name);
    const filename2 = getFileName(selectedFile?.compareFile.name);

    const zippedContent = await zip.generateAsync({ type: 'blob' });
    const zippedFolder = new File([zippedContent], `${filename1}_${filename2}_compare.zip`, {
      type: 'application/zip',
    });
    return zippedFolder;
  };

  const handleSuccess = (response: AxiosResponse) => {
    const result = response.data.file_content;
    if (result === undefined) {
      toast.error(`${filename}: Received undefined result. Please try again.`);
      updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
      return;
    }
    updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.DONE_COMPARING);
    toast.success(`${filename} comparison generated!`);
    updateFileAtIndex(selectedFileIndex, 'compareResult', result);
    updateFileAtIndex(selectedFileIndex, 's3_file_source', response.data.file_source);
    return;
  };

  const handleError = (e: AxiosError) => {
    if (e.response) {
      if (e.response.status === 400) {
        toast.error(`${filename}: Parameter is invalid. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
        return;
      } else if (e.response.status === 404) {
        toast.error(`${filename}: Job not found. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
        return;
      } else if (e.response.status === 500) {
        toast.error(`${filename}: Job has failed. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
        return;
      }
    }
    toast.error(`Error extracting ${filename}. Please try again.`);
    updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
  };

  const handleTimeout = () => {
    updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
    toast.error(`Extract request for ${filename} timed out. Please try again.`);
  };

  const handleCompare = async () => {
    updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.COMPARING);
    const zippedFolder = await zipFiles();
    console.log('Zipped Folder', zippedFolder);
    const fileData = await uploadFile({
      file: zippedFolder as File,
      token,
      clientId,
      jobType: 'file_comparison',
    });
    console.log('Data', fileData);
    if (fileData instanceof Error) {
      toast.error(`Error comparing files. Please try again.`);
      updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.READY);
      return;
    }
    toast.success(`Files uploaded for comparison!`);
    if (selectedFile && selectedFileIndex !== null) {
      await runJob({
        fileData,
        filename,
        selectedFile,
        selectedFileIndex,
        jobType: 'file_comparison',
        updateFileAtIndex,
        handleSuccess,
        handleError,
        handleTimeout,
      });
      // updateFileAtIndex(selectedFileIndex, 'compareState', CompareState.DONE_COMPARING);
    }
  };

  return (
    <div className="w-full h-full pt-4">
      {!FUNCTIONAL ? (
        <ComingSoonBanner />
      ) : (
        <>
          {selectedFile && !checkIfPDF(selectedFile.file) ? (
            <div className="h-full flex items-center justify-center text-2xl font-semibold">
              Please select a PDF paper to compare
            </div>
          ) : (
            <>
              {selectedFile?.compareState === CompareState.READY && (
                <div className="flex flex-col items-start w-full h-full gap-4">
                  <div className="w-full h-full text-neutral-800 grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
                    {paperOptions.length < 1 && (
                      <div className="absolute left-0 top-0 w-full flex items-center justify-center gap-4 bg-neutral-100 p-2 rounded-lg text-neutral-700">
                        <Warning size={20} weight="bold" />
                        <div className="italic">Please upload at least 2 Paper PDFs to compare.</div>
                      </div>
                    )}
                    <div className={columnStyles}>
                      <div className="text-2xl font-semibold">Paper 1</div>
                      <div className="container mx-auto overflow-x-auto whitespace-no-wrap text-center bg-neutral-100 rounded-lg">
                        <div className="inline-block text-justify p-2">{filename}</div>
                      </div>
                    </div>
                    <div className={columnStyles}>
                      <div className="text-2xl font-semibold">Paper 2</div>
                      <div className="w-full">
                        <Select
                          options={paperOptions}
                          disabled={paperOptions.length === 0 && checkIfPDF(selectedFile?.file)}
                          callback={handlePaper2Change}
                          optionLabel="Select a paper"
                        />
                      </div>
                    </div>
                  </div>
                  <div className={`w-full h-fit gap-4`}>
                    <Button
                      label="Compare Papers"
                      onClick={handleCompare}
                      small
                      labelIcon={TextColumns}
                      disabled={selectedFile.compareFile === undefined}
                    />
                  </div>
                </div>
              )}
              {selectedFile?.compareState === CompareState.COMPARING && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-xl font-semibold text-neutral-500">Comparing Papers</div>
                  <PulsingIcon Icon={TextColumns} size={40} />
                </div>
              )}
              {selectedFile?.compareState === CompareState.DONE_COMPARING && <div>Done Comparing</div>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CompareContainer;
