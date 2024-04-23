import usePlaygroundStore from '@/app/hooks/usePlaygroundStore';
import { TransformState, PlaygroundFile } from '@/app/types/PlaygroundTypes';
import axios, { AxiosError, AxiosResponse } from 'axios';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../Button';
import PulsingIcon from '../PulsingIcon';
import { DownloadSimple, GridNine } from '@phosphor-icons/react';
import QATable from './QATable';
import pollJobStatus from '@/app/actions/pollJobStatus';
import { downloadFile } from '@/app/actions/downloadFile';
import ResultContainer from './ResultContainer';
import { useProductionContext } from './ProductionContext';
import { runRequestJob } from '@/app/actions/runRequestJob';

const QAContainer = () => {
  const { apiURL } = useProductionContext();
  const { selectedFileIndex, files, token, clientId, filesFormData, updateFileAtIndex } = usePlaygroundStore();
  const [selectedFile, setSelectedFile] = useState<PlaygroundFile>();
  const [displayTable, setDisplayTable] = useState<string[][] | null>(null);
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
  }, [selectedFileIndex, files, updateFileAtIndex]);

  const updateDisplayTable = (resultList: string[][]) => {
    setDisplayTable(resultList);
  };

  const handleDownload = useCallback(() => {
    if (displayTable) {
      const columnNames = ['Context', 'Question', 'Answer'];
      const csvContent = [columnNames.map((value) => `"${value}"`).join(',')]
        .concat(displayTable.map((row) => row.map((value) => `"${value}"`).join(',')))
        .join('\n');
      downloadFile({
        filename,
        fileContent: csvContent,
        fileType: 'text/csv;charset=utf-8',
        suffix: '_QA_pairs.csv',
      });
    }
  }, [displayTable, filename]);

  const handleSuccess = (response: AxiosResponse) => {
    const result = response.data;
    if (result === undefined) {
      toast.error(`${filename}: Received undefined result. Please try again.`);
      updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
      return;
    }
    updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.DONE_TRANSFORMING);
    updateFileAtIndex(selectedFileIndex, 'qaResult', result);
    toast.success(`Generated QAs from ${filename}!`);
  };

  const handleError = (e: AxiosError) => {
    if (e.response) {
      if (e.response.status === 400) {
        toast.error(`${filename}: Parameter is invalid. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
        return;
      } else if (e.response.status === 404) {
        toast.error(`${filename}: Job not found. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
        return;
      } else if (e.response.status === 500) {
        toast.error(`${filename}: Job has failed. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
        return;
      }
    }
    toast.error(`Error transforming ${filename}. Please try again.`);
    updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
  };

  const handleTimeout = () => {
    updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
    toast.error(`Transform request for ${filename} timed out. Please try again.`);
  };

  const handleFileTransform = () => {
    updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.TRANSFORMING);

    const fileData = filesFormData.find((obj) => obj.presignedUrl.fields['x-amz-meta-filename'] === filename);
    if (!fileData) {
      updateFileAtIndex(selectedFileIndex, 'keyValueState', TransformState.READY);
      toast.error(`Error extracting ${filename}. Missing formData. Please try again.`);
      return;
    }
    const filesToTransform = [
      {
        s3_prefix: fileData.s3_prefix,
        source_type: 'dynamodb',
        s3_bucket: fileData.s3_bucket,
      },
    ];

    if (selectedFileIndex === null) {
      toast.error(`${filename}: missing selectedFileIndex. Please try again.`);
      updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
      return;
    }

    runRequestJob({
      apiURL,
      clientId,
      token,
      files: filesToTransform,
      jobType: 'qa_generation',
      jobId: selectedFile?.jobId,
      selectedFileIndex,
      filename,
      handleError,
      handleSuccess,
      handleTimeout,
      updateFileAtIndex,
    });
  };

  const handleHTMLTransform = async () => {
    const params = {
      token: token,
      client_id: clientId,
      files: [
        {
          url: selectedFile?.file,
          source_type: 'url',
        },
      ],
      job_type: 'qa_generation',
      job_id: selectedFile?.jobId,
    };
    axios
      .post(`${apiURL}/request`, params, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then((response) => {
        if (response.status === 200) {
          toast.success(`${filename} submitted for QA generation!`);
          updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.TRANSFORMING);
          setTimeout(() => {
            pollJobStatus({
              api_url: apiURL,
              getParams: {
                job_id: selectedFile?.jobId || '',
                user_id: selectedFile?.userId || '',
                job_type: 'qa_generation',
              },
              handleSuccess,
              handleError,
              handleTimeout,
            });
          }, 10000); // Need to delay the polling to give the server time to process the file
        } else {
          toast.error(`Error uploading ${filename}. Please try again.`);
          updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
        }
      })
      .catch((error) => {
        console.error('error', error);
        toast.error(`Error uploading ${filename}. Please try again.`);
        updateFileAtIndex(selectedFileIndex, 'qaState', TransformState.READY);
      });
  };

  const handleTransform = async () => {
    console.log(`Transforming ${filename} | job_id: ${selectedFile?.jobId}`);
    if (typeof selectedFile?.file === 'string') {
      handleHTMLTransform();
    } else {
      handleFileTransform();
    }
  };
  return (
    <>
      {selectedFile?.qaState === TransformState.READY && (
        <div className="flex flex-col items-start w-full h-full gap-4">
          <ResultContainer extractResult={selectedFile.extractResult} />
          <div className={`w-full h-fit gap-4`}>
            <Button label="Generate Question-Answer Pairs" onClick={handleTransform} small labelIcon={GridNine} />
          </div>
        </div>
      )}
      {selectedFile?.qaState === TransformState.TRANSFORMING && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-xl font-semibold text-neutral-500">Generating QAs</div>
          <PulsingIcon Icon={GridNine} size={40} />
        </div>
      )}
      {selectedFile?.qaState === TransformState.DONE_TRANSFORMING &&
        Object.keys(selectedFile?.qaResult || {}).length && (
          <div className="flex flex-col items-start w-full h-full gap-4">
            <div className="flex flex-col items-start w-full h-full overflow-auto relative border-solid border-2 border-neutral-100 rounded-lg">
              <QATable qaResult={selectedFile?.qaResult} updateDisplayTable={updateDisplayTable} />
            </div>
            <div className="w-full h-fit">
              <Button
                label="Download csv"
                onClick={handleDownload}
                small
                disabled={(Object.keys(selectedFile?.qaResult || {}).length || 0) === 0}
                labelIcon={DownloadSimple}
              />
            </div>
          </div>
        )}
    </>
  );
};

export default QAContainer;